import { Inject, Injectable } from "@nestjs/common";
import { IFileUploadService } from "./i-file-upload.service";

@Injectable()
export class FileUploadService implements IFileUploadService {
    constructor(
    ) { }

    uploadFile(file: Express.Multer.File): Promise<string> {
        console.log("File information:");
        console.log("Original name:", file.originalname);
        console.log("MIME type:", file.mimetype);
        console.log("Size:", file.size);

        const result = "File processed successfully";

        return Promise.resolve(result);
    }
}
