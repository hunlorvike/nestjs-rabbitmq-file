import { Module } from '@nestjs/common';
import { dataSourceOptions } from './database/data-source';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResponseInterceptor } from './shared/interceptors/response.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  imports: [

    TypeOrmModule.forRoot(dataSourceOptions),
  ],
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
  exports: []
})
export class AppModule { }
