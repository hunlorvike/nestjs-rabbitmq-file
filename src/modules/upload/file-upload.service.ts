import { Injectable, Logger } from "@nestjs/common";
import { RabbitmqService } from "../rabbitmq/rabbitmq.service";
import { IFileUploadService } from "./i-file-upload.service";
import { HttpException, HttpStatus } from "@nestjs/common";

@Injectable()
export class FileUploadService implements IFileUploadService {
    private readonly logger = new Logger(FileUploadService.name);

    constructor(
        private readonly rabbitmqService: RabbitmqService,
    ) { }

    async uploadFile(file: Express.Multer.File): Promise<{ message: string, status: number, filename: string }> {
        try {
            const startTime = process.hrtime();

            const result = await this.rabbitmqService.uploadFile(file);

            const endTime = process.hrtime(startTime);
            const elapsedTimeInSeconds = (endTime[0] + endTime[1] / 1e9).toFixed(2);
            const fileSizeInMB = file.size / (1024 * 1024);

            this.logger.log(`File processed successfully. Size: ${fileSizeInMB.toFixed(2)} MB. Time taken: ${elapsedTimeInSeconds} seconds`);

            return result;
        } catch (error) {
            this.handleUploadError(error);
        }
    }

    private handleUploadError(error: Error): void {
        this.logger.error(`Error while uploading file: ${error.message}`, error.stack);
        throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
