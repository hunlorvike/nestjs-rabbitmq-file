import { Controller, Inject, Post, UseInterceptors, UploadedFile, HttpException, HttpStatus, UploadedFiles, Get, NotFoundException, Param, Res, Logger } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Services } from '../../shared/constrains/constrain';
import { FileUploadDto } from './dtos/file-upload.dto';
import { MultiFileUploadDto } from './dtos/multi-file-upload.dto';
import { Response } from 'express';
import { IFileService } from './i-file.service';

@Controller('files')
@ApiTags('files')
export class FileController {
    private readonly logger = new Logger(FileController.name);

    constructor(
        @Inject(Services.FILE) private readonly fileService: IFileService
    ) { }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'File upload',
        type: FileUploadDto,
    })
    @ApiOperation({ summary: 'Upload a single file' })
    @ApiResponse({ status: HttpStatus.OK, description: 'File uploaded successfully' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad request' })
    @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, description: 'Internal server error' })
    async uploadFile(@UploadedFile() file: Express.Multer.File): Promise<{ data: any, code: number, msg: string }> {
        try {
            if (!file) {
                throw new HttpException('File not provided', HttpStatus.BAD_REQUEST);
            }
            const result = await this.fileService.uploadFile(file);

            return { data: result.filename, code: result.status, msg: result.message };
        } catch (error) {
            throw new HttpException(error.message || 'Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('upload-batch')
    @UseInterceptors(FilesInterceptor('files'))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Batch files upload',
        type: MultiFileUploadDto,
    })
    @ApiOperation({ summary: 'Upload files in batch' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Files uploaded successfully' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad request' })
    @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, description: 'Internal server error' })
    async uploadBatchFiles(@UploadedFiles() files: Express.Multer.File[]): Promise<{ data: any, code: number, msg: string }> {
        try {
            if (!files || files.length === 0) {
                throw new HttpException('Files not provided', HttpStatus.BAD_REQUEST);
            }
    
            const results = await this.fileService.uploadBatchFiles(files);
    
            const successfulUploads = results.map(result => result.filename);
            const failedUploads = results.filter(result => result === null);
    
            const msg = failedUploads.length > 0
                ? `Files processing completed with ${failedUploads.length} failures.`
                : 'Files processing completed successfully.';
    
            return { data: successfulUploads, code: HttpStatus.OK, msg };
        } catch (error) {
            throw new HttpException(error.message || 'Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('download/:filename')
    @ApiOperation({ summary: 'Download a file by filename' })
    @ApiResponse({ status: HttpStatus.OK, description: 'File downloaded successfully' })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'File not found' })
    @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, description: 'Internal server error' })
    async downloadFile(@Param('filename') filename: string, @Res() res: Response): Promise<void> {
        try {
            if (!filename) {
                throw new NotFoundException('Filename is required');
            }

            const fileStream = await this.fileService.downloadFile(filename);

            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            res.setHeader('Content-Type', 'application/octet-stream');

            fileStream.pipe(res);

            fileStream.on('end', () => {
                this.logger?.log(`File ${filename} downloaded successfully.`);
            });

            fileStream.on('error', (error) => {
                this.logger.error(`Error downloading file ${filename}: ${error.message}`);
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Internal Server Error');
            });

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
