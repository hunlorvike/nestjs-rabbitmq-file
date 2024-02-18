import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './database/data-source';
import { RabbitmqModule } from './modules/rabbitmq/rabbitmq.module';
import { FileModule } from './modules/files/file.module';
import { ResponseInterceptor } from './shared/interceptors/response.interceptor';
import { ConfigModule } from '@nestjs/config';

@Module({
	imports: [
		ConfigModule.forRoot(),
		FileModule,
		RabbitmqModule,
		TypeOrmModule.forRoot(dataSourceOptions),
	],
	providers: [
		{
			provide: APP_INTERCEPTOR,
			useClass: ResponseInterceptor,
		},

	]
})
export class AppModule { }
