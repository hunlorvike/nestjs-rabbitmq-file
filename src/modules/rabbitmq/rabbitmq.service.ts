import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { connect, Channel, Connection } from 'amqplib';
import { Queues } from "../../shared/constrains/constrain";
import { dirname, join } from 'path';
import { Readable } from "stream";
import { generateUniqueFileName } from "../../shared/utils/generate-unique-filename";
import * as dotenv from 'dotenv';
import { createReadStream, existsSync, mkdirSync, createWriteStream, promises } from "fs";
dotenv.config();

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
            this.connection = await connect(process.env.RABBITMQ_URL);
            this.channel = await this.connection.createChannel();

            await this.channel.assertQueue(Queues.UPLOAD, { durable: false });
            await this.channel.assertQueue(Queues.DOWNLOAD, { durable: false });
        } catch (error) {
            console.error('Error while initializing connection and channel:', error);
            throw new HttpException('Failed to initialize connection and channel', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private async processFiles(): Promise<void> {
        while (this.processingQueue.length > 0 && this.currentWorkers < this.maxConcurrentProcessing) {
            const batch = this.processingQueue.splice(0, this.maxConcurrentProcessing - this.currentWorkers);

            const batchPromises = batch.map(({ filePath, resolve, isUpload }) =>
                this.processFile(filePath, resolve, isUpload)
            );

            await Promise.all(batchPromises);
        }

        if (this.processingQueue.length > 0) {
            setImmediate(() => this.processFiles());
        }
    }

    private async processFile(filePath: string, resolve: () => void, isUpload: boolean): Promise<void> {
        try {
            if (isUpload) {
                await this.processUpload(filePath, resolve, this.maxRetryAttempts);
            } else {
                await this.processDownload(filePath, resolve, this.maxRetryAttempts);
            }
        } catch (error) {
            console.error(`Error processing file '${filePath}': ${error.message}`);
        } finally {
            this.currentWorkers--;
            resolve();
        }
    }

    private async processUpload(filePath: string, resolve: () => void, retryAttempts: number): Promise<void> {
        try {
            const readStream = createReadStream(filePath);
            await this.sendStreamToQueue(Queues.UPLOAD, readStream);
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

    async uploadFiles(files: Express.Multer.File[]): Promise<{ message: string, status: number, filenames: string[] }> {
        try {
            const uploadPromises = files.map(file => this.uploadFile(file));
            const results = await Promise.all(uploadPromises);

            const successfulUploads = results.filter(result => result.status === HttpStatus.ACCEPTED);

            return {
                message: "Batch file processing request received",
                status: HttpStatus.ACCEPTED,
                filenames: successfulUploads.map(result => result.filename)
            };
        } catch (error) {
            throw new HttpException(error.message || 'Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
        }
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

                await this.ensureConnection();

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


    private async processDownload(filePath: string, resolve: () => void, retryAttempts: number): Promise<void> {
        try {
            const fileData = await promises.readFile(filePath);
            const fileStream = Readable.from(fileData);
            await this.sendStreamToQueue(Queues.DOWNLOAD, fileStream);
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

    private async sendStreamToQueue(queue: string, stream: Readable): Promise<void> {
        return new Promise<void>((fileResolve, reject) => {
            stream.on('data', (chunk) => {
                this.channel.sendToQueue(queue, chunk, { persistent: true });
            });

            stream.on('end', fileResolve);
            stream.on('error', reject);
        });
    }

    private async enqueueFile(filePath: string, isUpload: boolean): Promise<void> {
        return new Promise((resolve) => {
            this.processingQueue.push({ filePath, resolve, isUpload });
            this.processFiles();
        });
    }

    private async ensureConnection(): Promise<void> {
        try {
            if (this.connection && typeof this.connection === 'object' && this.connection.connection && typeof this.connection.connection.isConnected === 'function' && !this.connection.connection.isConnected()) {
                await this.init();
            }
        } catch (error) {
            console.error('Error while ensuring connection:', error);
        }
    }

    private async handleRetry(retryAttempts: number): Promise<void> {
        const backoffTime = Math.pow(2, retryAttempts) * 1000;
        console.log(`Retrying file processing. Attempt ${retryAttempts + 1} of ${this.maxRetryAttempts}. Waiting for ${backoffTime} milliseconds.`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
    }
}
