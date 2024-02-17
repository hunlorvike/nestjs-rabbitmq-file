import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './database/data-source';
import { RabbitmqModule } from './modules/rabbitmq/rabbitmq.module';
import { FileUploadModule } from './modules/files/file-upload.module';
import { ResponseInterceptor } from './shared/interceptors/response.interceptor';

@Module({
	imports: [
		FileUploadModule,
		RabbitmqModule,
		TypeOrmModule.forRoot(dataSourceOptions),
	],
	controllers: [],
	providers: [
		{
			provide: APP_INTERCEPTOR,
			useClass: ResponseInterceptor,
		},

	],
	exports: [],
})
export class AppModule { }
