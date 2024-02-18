import { Controller, Inject, Post, UseInterceptors, UploadedFile, HttpException, HttpStatus, UploadedFiles, Get, NotFoundException, Param, Res, Logger } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Services } from '../../shared/constrains/constrain';
import { FileService } from './file.service';
import { FileUploadDto } from './dtos/file-upload.dto';
import { MultiFileUploadDto } from './dtos/multi-file-upload.dto';
import { Response } from 'express';
import * as os from 'os';
import * as streamLength from 'stream-length';

@Controller('files')
@ApiTags('files')
export class FileController {
    private readonly logger = new Logger(FileController.name);

    constructor(
        @Inject(Services.FILE) private readonly fileService: FileService
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
            const startTime = process.hrtime();

            const cpuUsage = process.cpuUsage();
            const memoryUsage = process.memoryUsage();
            const totalMemory = os.totalmem();
            const freeMemory = os.freemem();

            const result = await this.fileService.uploadFile(file);

            const endTime = process.hrtime(startTime);
            const elapsedTimeInSeconds = (endTime[0] + endTime[1] / 1e9).toFixed(2);
            const fileSizeInMB = file.size / (1024 * 1024);

            this.logger.log(`File processed successfully. 
                Size: ${fileSizeInMB.toFixed(2)} MB. 
                Time taken: ${elapsedTimeInSeconds} seconds. 
                CPU Usage: ${cpuUsage.user}μs user, ${cpuUsage.system}μs system. 
                Memory Usage: ${memoryUsage.heapUsed / (1024 * 1024)} MB used, ${memoryUsage.heapTotal / (1024 * 1024)} MB total. 
                System Memory: ${freeMemory / (1024 * 1024)} MB free of ${totalMemory / (1024 * 1024)} MB total.`);


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
    @ApiOperation({ summary: 'Upload multiple files' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Files uploaded successfully' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad request' })
    @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, description: 'Internal server error' })
    async uploadMultipleFiles(@UploadedFiles() files: Express.Multer.File[]): Promise<{ data: any, code: number, msg: string }> {
        try {
            if (!files || files.length === 0) {
                throw new HttpException('Files not provided', HttpStatus.BAD_REQUEST);
            }

            const startTime = process.hrtime();

            const cpuUsage = process.cpuUsage();
            const memoryUsage = process.memoryUsage();
            const totalMemory = os.totalmem();
            const freeMemory = os.freemem();

            const results = await Promise.all(files.map(async (file, index) => {
                try {
                    const result = await this.fileService.uploadFile(file);
                    this.logger.log(`File ${index + 1} processed successfully. 
                    Filename: ${result.filename}. 
                    Status: ${result.status}. 
                    Message: ${result.message}.`);
                    return result.filename;
                } catch (error) {
                    this.logger.error(`Error processing file ${index + 1}: ${error.message}`);
                    return null;
                }
            }));

            const successfulUploads = results.filter(result => result !== null);
            const failedUploads = results.filter(result => result === null);

            const endTime = process.hrtime(startTime);
            const elapsedTimeInSeconds = (endTime[0] + endTime[1] / 1e9).toFixed(2);

            const msg = failedUploads.length > 0
                ? `Files processing completed with ${failedUploads.length} failures.`
                : 'Files processing completed successfully.';

            this.logger.log(`Files processing summary. 
            Time taken: ${elapsedTimeInSeconds} seconds. 
            CPU Usage: ${cpuUsage.user}μs user, ${cpuUsage.system}μs system. 
            Memory Usage: ${memoryUsage.heapUsed / (1024 * 1024)} MB used, ${memoryUsage.heapTotal / (1024 * 1024)} MB total. 
            System Memory: ${freeMemory / (1024 * 1024)} MB free of ${totalMemory / (1024 * 1024)} MB total.`);

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

            const startTime = process.hrtime();

            const cpuUsage = process.cpuUsage();
            const memoryUsage = process.memoryUsage();
            const totalMemory = os.totalmem();
            const freeMemory = os.freemem();

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
