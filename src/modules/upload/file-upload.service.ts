// file-upload.service.ts
import { Injectable } from "@nestjs/common";
import { RabbitmqService } from "../rabbitmq/rabbitmq.service";
import { IFileUploadService } from "./i-file-upload.service";

@Injectable()
export class FileUploadService implements IFileUploadService {
    constructor(
        private readonly rabbitmqService: RabbitmqService,
    ) { }

    async uploadFile(file: Express.Multer.File): Promise<string> {
        const message = {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
        };

        await this.rabbitmqService.sendMessage(message);

        const result = "File processed successfully";

        return Promise.resolve(result);
    }
}
