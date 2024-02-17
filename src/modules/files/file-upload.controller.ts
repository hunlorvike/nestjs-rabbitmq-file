import { Controller, Inject, Post, UseInterceptors, UploadedFile, HttpException, HttpStatus, UploadedFiles, Get, NotFoundException, Param, Res, Logger } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Services } from '../../shared/constrains/constrain';
import { FileUploadService } from './file-upload.service';
import { FileUploadDto } from './dtos/file-upload.dto';
import { MultiFileUploadDto } from './dtos/multi-file-upload.dto';
import * as fs from 'fs';
import * as path from 'path';
import { Response } from 'express';
import { createReadStream } from 'fs';

@Controller('files')
@ApiTags('files')
export class FileUploadController {
    private readonly logger = new Logger(FileUploadController.name);

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
    async uploadFile(@UploadedFile() file: Express.Multer.File): Promise<{ data: any, code: number, msg: string }> {
        try {
            if (!file) {
                throw new HttpException('File not provided', HttpStatus.BAD_REQUEST);
            }

            const result = await this.uploadService.uploadFile(file);

            return { data: result.filename, code: result.status, msg: result.message };
        } catch (error) {
            throw new HttpException(error.message || 'Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('upload-multiple')
    @UseInterceptors(FilesInterceptor('files'))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Multiple files upload',
        type: MultiFileUploadDto,
    })
    async uploadMultipleFiles(@UploadedFiles() files: Express.Multer.File[]): Promise<{ data: any, code: number, msg: string }> {
        try {
            if (!files || files.length === 0) {
                throw new HttpException('Files not provided', HttpStatus.BAD_REQUEST);
            }

            const results = await Promise.all(files.map(file => this.uploadService.uploadFile(file)));

            const data = results.map(result => result.filename);

            return { data, code: HttpStatus.OK, msg: "Files processing request received" };
        } catch (error) {
            throw new HttpException(error.message || 'Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }


    @Get('download/:filename')
    async downloadFile(@Param('filename') filename: string, @Res() res: Response) {
        try {
            if (filename === undefined || filename === '') {
                throw new NotFoundException('Filename is required');
            }

            const filePath = path.join(__dirname, '../../../public', filename);

            if (fs.existsSync(filePath)) {
                res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
                res.setHeader('Content-Type', 'application/octet-stream');

                this.logger?.log(`File ${filename} downloaded successfully.`); 

                const fileStream = createReadStream(filePath, { highWaterMark: 64 * 1024 });
                fileStream.pipe(res);

            } else {
                return res.status(HttpStatus.NOT_FOUND).send('File not found');
            }

        } catch (error) {
            console.error(error);
            if (error instanceof NotFoundException) {
                res.status(HttpStatus.NOT_FOUND).send(error.message);
            } else {
                const errorFilename = filename || 'undefined';
                this.logger.error(`Error downloading file ${errorFilename}: ${error?.message}`);
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Internal Server Error');
            }
        }
    }

}
