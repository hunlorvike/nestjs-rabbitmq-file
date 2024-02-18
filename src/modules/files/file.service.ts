import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import { RabbitmqService } from "../rabbitmq/rabbitmq.service";
import { IFileService } from "./i-file.service";
import { Readable } from "stream";

@Injectable()
export class FileService implements IFileService {
    private readonly logger = new Logger(FileService.name);

    constructor(
        private readonly rabbitmqService: RabbitmqService,
    ) { }

    async uploadFile(file: Express.Multer.File): Promise<{ message: string, status: number, filename: string }> {
        try {
            const result = await this.rabbitmqService.uploadFile(file);
            return result;
        } catch (error) {
            this.logger.error(`Error while uploading file: ${error.message}`, error.stack);
            throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async downloadFile(filename: string): Promise<Readable> {
        try {
            const fileStream = await this.rabbitmqService.downloadFile(filename);
            return fileStream;
        } catch (error) {
            this.logger.error(`Error while downloading file ${filename}: ${error.message}`, error.stack);
            throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
