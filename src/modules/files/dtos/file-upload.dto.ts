// file-upload.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class FileUploadDto {
	@ApiProperty({ type: 'string', format: 'binary' })
	@IsNotEmpty({ message: 'File cannot be empty' })
	file: Express.Multer.File;

	@ApiProperty({ type: 'string' })
	@IsString({ message: 'Filename must be a string' })
	@IsNotEmpty({ message: 'Filename cannot be empty' })
	filename: string;

}