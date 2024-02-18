import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { connect, Channel, Connection } from 'amqplib';
import { Queues } from "../../shared/constrains/constrain";
import { createReadStream, createWriteStream, existsSync, promises as fsPromises, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from "stream";
import { generateUniqueFileName } from "../../shared/utils/generate-unique-filename";
import PQueue from "p-queue";

@Injectable()
export class RabbitmqService {
    private connection: Connection;
    private channel: Channel;
    private processingQueue: Array<{ filePath: string, resolve: () => void, isUpload: boolean }>;
    private isProcessing: boolean;
    private maxConcurrentProcessing: number;
    private maxRetryAttempts: number;
    private currentWorkers: number;

    constructor() {
        this.init();
        this.processingQueue = [];
        this.isProcessing = false;
        this.maxConcurrentProcessing = 5;
        this.currentWorkers = 0;
        this.maxRetryAttempts = 3;
    }

    private async init(): Promise<void> {
        try {
            this.connection = await connect('amqp://rabbitmq_user:rabbitmq_password@localhost:5672');
            this.channel = await this.connection.createChannel();

            await this.channel.assertQueue(Queues.UPLOAD, { durable: false });
            await this.channel.assertQueue(Queues.DOWNLOAD, { durable: false });
        } catch (error) {
            console.error('Error while initializing connection and channel:', error);
            throw new HttpException('Failed to initialize connection and channel', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private async processFiles(): Promise<void> {
        if (!this.isProcessing && this.processingQueue.length > 0 && this.currentWorkers < this.maxConcurrentProcessing) {
            this.isProcessing = true;
            this.currentWorkers++;

            const { filePath, resolve, isUpload } = this.processingQueue.shift();

            if (isUpload) {
                await this.processUpload(filePath, resolve, 0);
            } else {
                await this.processDownload(filePath, resolve, 0);
            }

            this.isProcessing = false;
            this.currentWorkers--;

            this.processFiles();
        }
    }

    private async processUpload(filePath: string, resolve: () => void, retryAttempts: number): Promise<void> {
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
            console.error(`Error while processing file '${filePath}': ${error.message}`);

            if (retryAttempts < this.maxRetryAttempts) {
                await this.handleRetry(retryAttempts);
                await this.processUpload(filePath, resolve, retryAttempts + 1);
            } else {
                console.error(`Max retry attempts reached for file processing: ${filePath}`);
            }
        }
    }

    private async enqueueFile(filePath: string, isUpload: boolean): Promise<void> {
        return new Promise((resolve) => {
            this.processingQueue.push({ filePath, resolve, isUpload });
            this.processFiles();
        });
    }


    async uploadFile(file: Express.Multer.File): Promise<{ message: string, status: number, filename: string }> {
        let retryAttempts = 0;

        while (retryAttempts < this.maxRetryAttempts) {
            try {
                const fileName = generateUniqueFileName(file.originalname);
                const filePath = join(__dirname, '../../../', 'public', fileName);

                const directory = dirname(filePath);
                if (!existsSync(directory)) {
                    mkdirSync(directory, { recursive: true });
                }

                const writeStream = createWriteStream(filePath);
                writeStream.write(file.buffer);
                writeStream.end();

                await this.enqueueFile(filePath, true);

                return {
                    message: "File processing request received",
                    status: HttpStatus.ACCEPTED,
                    filename: fileName
                };
            } catch (error) {
                console.error(`Error while uploading file: ${error.message}`);

                retryAttempts++;
                if (retryAttempts === this.maxRetryAttempts) {
                    throw new HttpException('Max retry attempts reached', HttpStatus.INTERNAL_SERVER_ERROR);
                }

                await this.handleRetry(retryAttempts);
            }
        }
    }

    async downloadFile(filename: string): Promise<Readable> {
        let retryAttempts = 0;

        while (retryAttempts < this.maxRetryAttempts) {
            try {
                const filePath = join(__dirname, '../../../', 'public', filename);

                if (!existsSync(filePath)) {
                    throw new HttpException('File not found', HttpStatus.NOT_FOUND);
                }

                await this.enqueueFile(filePath, false);

                return createReadStream(filePath);
            } catch (error) {
                console.error(`Error while processing download request: ${error.message}`);

                retryAttempts++;
                if (retryAttempts === this.maxRetryAttempts) {
                    throw new HttpException('Max retry attempts reached', HttpStatus.INTERNAL_SERVER_ERROR);
                }

                await this.handleRetry(retryAttempts);
            }
        }
    }

    private async processDownload(filePath: string, resolve: () => void, retryAttempts: number): Promise<void> {
        try {
            const fileStream = createReadStream(filePath, { highWaterMark: 64 * 1024 });

            await new Promise((fileResolve, reject) => {
                fileStream.on('end', fileResolve);
                fileStream.on('error', reject);
            });

            resolve();
        } catch (error) {
            console.error(`Error while processing download for file '${filePath}': ${error.message}`);

            if (retryAttempts < this.maxRetryAttempts) {
                await this.handleRetry(retryAttempts);
                await this.processDownload(filePath, resolve, retryAttempts + 1);
            } else {
                console.error(`Max retry attempts reached for download processing: ${filePath}`);
            }
        }
    }

    private async handleRetry(retryAttempts: number): Promise<void> {
        const backoffTime = Math.pow(2, retryAttempts) * 1000;
        console.log(`Retrying file processing. Attempt ${retryAttempts + 1} of ${this.maxRetryAttempts}. Waiting for ${backoffTime} milliseconds.`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
    }
}
