import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './database/data-source';
import { RabbitmqModule } from './modules/rabbitmq/rabbitmq.module';
import { FileModule } from './modules/files/file.module';
import { ResponseInterceptor } from './shared/interceptors/response.interceptor';

@Module({
	imports: [
		FileModule,
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
