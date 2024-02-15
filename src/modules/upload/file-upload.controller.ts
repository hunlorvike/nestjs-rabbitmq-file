// file-upload.controller.ts

import { Controller, Inject, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Services } from '../../shared/constrains/constrain';
import { FileUploadService } from './file-upload.service';

@Controller('files')
@ApiTags('files')
export class FileUploadController {
    constructor(
        @Inject(Services.UPLOAD) private readonly uploadService: FileUploadService
    ) { }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    async uploadFile(@UploadedFile() file: Express.Multer.File): Promise<{ data: string }> {
        if (!file) {
            return { data: 'File not provided' };
        }

        const result = await this.uploadService.uploadFile(file);
        return { data: result };
    }
}
