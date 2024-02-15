// file-upload.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';
import { Express } from 'express';

export class FileUploadDto {
    @ApiProperty({ type: 'string', format: 'binary' })
    @IsNotEmpty()
    file: Express.Multer.File;
}
