// file-upload.module.ts
import { Module } from '@nestjs/common';
import { FileUploadController } from './file-upload.controller';
import { Services } from '../../shared/constrains/constrain';
import { FileUploadService } from './file-upload.service';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';

@Module({
	imports: [],
	controllers: [FileUploadController],
	providers: [
		FileUploadService,
		{
			provide: Services.UPLOAD,
			useClass: FileUploadService,
		},
		RabbitmqService
	],
	exports: [FileUploadService],
})
export class FileUploadModule { }
