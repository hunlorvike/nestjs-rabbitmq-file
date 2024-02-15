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
    private processingQueue: Array<{ filePath: string, resolve: () => void }>;
    private isProcessing: boolean;
    private maxConcurrentProcessing: number;
    private maxRetryAttempts: number;
    private currentWorkers: number;

    constructor() {
        this.init();
        this.processingQueue = [];
        this.isProcessing = false;
        this.maxConcurrentProcessing = 2;
        this.currentWorkers = 0;
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

    async uploadFile(file: Express.Multer.File): Promise<{ message: string, status: number, filename: string }> {
        let retryAttempts = 0;

        while (retryAttempts < this.maxRetryAttempts) {
            try {

                const fileName = this.generateUniqueFileName(file.originalname);
                const filePath = join(__dirname, '../../../', 'public', fileName);

                const directory = dirname(filePath);
                if (!existsSync(directory)) {
                    mkdirSync(directory, { recursive: true });
                }

                const writeStream = createWriteStream(filePath);

                writeStream.write(file.buffer);
                writeStream.end();

                await this.enqueueFile(filePath);

                return {
                    message: "File processing request received",
                    status: HttpStatus.ACCEPTED,
                    filename: fileName
                };
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

    private generateUniqueFileName(originalFilename: string): string {
        const timestamp = new Date().getTime();
        const randomString = Math.random().toString(36).substring(7);
        const uniqueName = `${timestamp}_${randomString}_${originalFilename}`;
        return uniqueName.replace(/[^a-zA-Z0-9_.]/g, "_");
    }

    private async enqueueFile(filePath: string): Promise<void> {
        return new Promise((resolve) => {
            this.processingQueue.push({ filePath, resolve });
            this.processFiles();
        });
    }

    private async processFiles(): Promise<void> {
        if (!this.isProcessing && this.processingQueue.length > 0 && this.currentWorkers < this.maxConcurrentProcessing) {
            this.isProcessing = true;
            this.currentWorkers++;

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
                this.currentWorkers--;

                this.processFiles();
            }
        }
    }
}