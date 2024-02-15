// app.module.ts
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ClientProxyFactory, Transport, RmqOptions } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './database/data-source';
import { RabbitmqModule } from './modules/rabbitmq/rabbitmq.module';
import { FileUploadModule } from './modules/upload/file-upload.module';
import { ResponseInterceptor } from './shared/interceptors/response.interceptor';
import { Queues, Services } from './shared/constrains/constrain';

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
