// file-upload.controller.ts

import { Controller, Inject, Post, UseInterceptors, UploadedFile, Body, HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Services } from '../../shared/constrains/constrain';
import { FileUploadService } from './file-upload.service';
import { FileUploadDto } from './dtos/file-upload.dto';

@Controller('files')
@ApiTags('files')
export class FileUploadController {
    constructor(
        @Inject(Services.UPLOAD) private readonly uploadService: FileUploadService
    ) { }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'File upload',
        type: FileUploadDto,
    })
    async uploadFile(@UploadedFile() file: Express.Multer.File): Promise<{ data: string }> {
        try {
            console.log(file);

            if (!file) {
                throw new HttpException('File not provided', HttpStatus.BAD_REQUEST);
            }

            const result = await this.uploadService.uploadFile(file);
            return { data: result };
        } catch (error) {
            throw new HttpException(error.message || 'Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
