import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { connect, Channel, Connection } from 'amqplib';
import { Queues } from "../../shared/constrains/constrain";
import { createReadStream, existsSync, promises as fsPromises, mkdirSync } from 'fs';
import { Express } from 'express';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RabbitmqService {
    private connection: Connection;
    private channel: Channel;
    private processingQueue: Array<{ filePath: string, resolve: () => void }>;
    private isProcessing: boolean;
    private maxConcurrentProcessing: number;
    private maxRetryAttempts: number;

    constructor() {
        this.init();
        this.processingQueue = [];
        this.isProcessing = false;
        this.maxConcurrentProcessing = 10;
        this.maxRetryAttempts = 3;
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
        let retryAttempts = 0;

        while (retryAttempts < this.maxRetryAttempts) {
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

                await this.enqueueFile(filePath);

                return "File processing request received";
            } catch (error) {
                console.error('Error while uploading file:', error);

                retryAttempts++;
                if (retryAttempts === this.maxRetryAttempts) {
                    throw new HttpException('Max retry attempts reached', HttpStatus.INTERNAL_SERVER_ERROR);
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    private async enqueueFile(filePath: string): Promise<void> {
        return new Promise((resolve) => {
            this.processingQueue.push({ filePath, resolve });
            this.processFiles();
        });
    }

    private async processFiles(): Promise<void> {
        if (!this.isProcessing && this.processingQueue.length > 0) {
            this.isProcessing = true;
            const { filePath, resolve } = this.processingQueue.shift();

            try {
                const readStream = createReadStream(filePath);
                readStream.on('readable', () => {
                    let chunk;
                    while (null !== (chunk = readStream.read())) {
                        this.channel.sendToQueue(Queues.FILE_QUEUE, chunk, { persistent: true });
                    }
                });

                await new Promise((fileResolve, reject) => {
                    readStream.on('end', fileResolve);
                    readStream.on('error', reject);
                });

                resolve();
            } catch (error) {
                console.error('Error while processing file:', error);
            } finally {
                this.isProcessing = false;
                this.processFiles();
            }
        }
    }
}
