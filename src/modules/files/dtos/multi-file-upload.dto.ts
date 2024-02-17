// multi-file-upload.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty } from 'class-validator';

export class MultiFileUploadDto {
    @ApiProperty({ type: 'array', items: { type: 'string', format: 'binary' } })
    @IsArray()
    @IsNotEmpty({ each: true })
    files: Express.Multer.File[];
}
