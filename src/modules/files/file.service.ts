import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import { RabbitmqService } from "../rabbitmq/rabbitmq.service";
import { IFileService } from "./i-file.service";
import { Readable } from "stream";
import * as os from 'os';
import * as streamLength from 'stream-length';

@Injectable()
export class FileService implements IFileService {
    private readonly logger = new Logger(FileService.name);

    constructor(
        private readonly rabbitmqService: RabbitmqService,
    ) { }

    async uploadFile(file: Express.Multer.File): Promise<{ message: string, status: number, filename: string }> {
        try {
            const startTime = process.hrtime();

            const cpuUsage = process.cpuUsage();
            const memoryUsage = process.memoryUsage();
            const totalMemory = os.totalmem();
            const freeMemory = os.freemem();

            const result = await this.rabbitmqService.uploadFile(file);
            const endTime = process.hrtime(startTime);
            const elapsedTimeInSeconds = (endTime[0] + endTime[1] / 1e9).toFixed(2);
            const fileSizeInMB = file.size / (1024 * 1024);

            this.logger.log(`File processed successfully. 
                Size: ${fileSizeInMB.toFixed(2)} MB. 
                Time taken: ${elapsedTimeInSeconds} seconds. 
                CPU Usage: ${cpuUsage.user}μs user, ${cpuUsage.system}μs system. 
                Memory Usage: ${memoryUsage.heapUsed / (1024 * 1024)} MB used, ${memoryUsage.heapTotal / (1024 * 1024)} MB total. 
                System Memory: ${freeMemory / (1024 * 1024)} MB free of ${totalMemory / (1024 * 1024)} MB total.`);

            return result;
        } catch (error) {
            this.logger.error(`Error while uploading file: ${error.message}`, error.stack);
            throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async uploadBatchFiles(files: Express.Multer.File[]): Promise<{ filename: string, status: number, message: string }[]> {
        const results = await Promise.all(files.map(async (file, index) => {
            try {
                const result = await this.uploadFile(file);
                return { filename: result.filename, status: result.status, message: result.message };
            } catch (error) {
                console.error(`Error processing file ${index + 1}: ${error.message}`);
                return null;
            }
        }));

        return results.filter(result => result !== null);
    }

    async downloadFile(filename: string): Promise<Readable> {
        try {
            const startTime = process.hrtime();

            const cpuUsage = process.cpuUsage();
            const memoryUsage = process.memoryUsage();
            const totalMemory = os.totalmem();
            const freeMemory = os.freemem();

            const fileStream = await this.rabbitmqService.downloadFile(filename);
            const fileSizeInBytes = await streamLength(fileStream);
            const fileSizeInMB = fileSizeInBytes / (1024 * 1024);

            const endTime = process.hrtime(startTime);
            const elapsedTimeInSeconds = (endTime[0] + endTime[1] / 1e9).toFixed(2);

            this.logger.log(`File ${filename} downloaded successfully. 
                Size: ${fileSizeInMB.toFixed(2)} MB. 
                Time taken: ${elapsedTimeInSeconds} seconds. 
                CPU Usage: ${cpuUsage.user}μs user, ${cpuUsage.system}μs system. 
                Memory Usage: ${memoryUsage.heapUsed / (1024 * 1024)} MB used, ${memoryUsage.heapTotal / (1024 * 1024)} MB total. 
                System Memory: ${freeMemory / (1024 * 1024)} MB free of ${totalMemory / (1024 * 1024)} MB total.`);

            return fileStream;
        } catch (error) {
            this.logger.error(`Error while downloading file ${filename}: ${error.message}`, error.stack);
            throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
