// file-upload.module.ts
import { Module } from '@nestjs/common';
import { FileController } from './file.controller';
import { Services } from '../../shared/constrains/constrain';
import { FileService } from './file.service';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';

@Module({
	imports: [],
	controllers: [FileController],
	providers: [
		FileService,
		{
			provide: Services.UPLOAD,
			useClass: FileService,
		},
		RabbitmqService
	],
	exports: [FileService],
})
export class FileModule { }
