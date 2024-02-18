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
		{
			provide: Services.FILE,
			useClass: FileService,
		},
		RabbitmqService
	],
})
export class FileModule { }
