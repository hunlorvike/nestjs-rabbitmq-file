import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { connect, Channel, Connection } from 'amqplib';
import { Queues } from "../../shared/constrains/constrain";
import { createReadStream, createWriteStream, existsSync, promises as fsPromises, mkdirSync } from 'fs';
import { Express } from 'express';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid'; 

@Injectable()
export class RabbitmqService {
    private connection: Connection;
    private channel: Channel;

    constructor() {
        this.init();
    }

    private async init(): Promise<void> {
        try {
            this.connection = await connect('amqp://rabbitmq_user:rabbitmq_password@localhost:5672');
            this.channel = await this.connection.createChannel();
            await this.channel.assertQueue(Queues.FILE_QUEUE, { durable: false });
        } catch (error) {
            console.error('Error while initializing connection and channel:', error);
        }
    }

    async uploadFile(file: Express.Multer.File): Promise<string> {
        try {
            if (!file) {
                throw new HttpException('File not provided', HttpStatus.BAD_REQUEST);
            }

            const fileName = uuidv4() + '-' + file.originalname;
            const filePath = join(__dirname, '../../../', 'public', fileName);

            const directory = dirname(filePath);
            if (!existsSync(directory)) {
                mkdirSync(directory, { recursive: true });
            }

            await fsPromises.writeFile(filePath, file.buffer);

            await this.processFile(filePath);

            return "File processed successfully";
        } catch (error) {
            console.error('Error while uploading file:', error);
            throw new HttpException(error.message || 'Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private async processFile(filePath: string): Promise<void> {
        try {
            const readStream = createReadStream(filePath);
            readStream.on('readable', () => {
                let chunk;
                while (null !== (chunk = readStream.read())) {
                    this.channel.sendToQueue(Queues.FILE_QUEUE, chunk, { persistent: true });
                }
            });

            await new Promise((resolve, reject) => {
                readStream.on('end', resolve);
                readStream.on('error', reject);
            });
        } catch (error) {
            console.error('Error while processing file:', error);
            throw new HttpException('Error while processing file', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
