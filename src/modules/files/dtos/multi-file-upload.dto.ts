import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsNotEmpty } from 'class-validator';

export class MultiFileUploadDto {
    @ApiProperty({ type: 'array', items: { type: 'string', format: 'binary' } })
    @IsArray()
    @IsNotEmpty({ each: true })
    @Transform(({ value }) => value.map((file: Express.Multer.File) => ({ file })))
    files: Express.Multer.File[];
}
