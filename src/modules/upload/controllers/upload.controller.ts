// upload.controller.ts

import { Body, Controller, Get, Post, HttpStatus, UseInterceptors } from '@nestjs/common';
import { ResponseStatus } from '../../../shared/enums/response.enum';
import { ResponseInterceptor } from '../../../shared/interceptors/response.interceptor';
import { UploadService } from '../services/upload.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) { }

  @Get()
  @UseInterceptors(ResponseInterceptor)
  getHello() {
    const data = 'Hello World!';

    return {
      data: data,
      code: HttpStatus.OK,
      msg: ResponseStatus.SUCCESSFULLY
    };
  }

  @Post()
  async processUpload(@Body() data: any): Promise<void> {
    await this.uploadService.processUpload(data);
  }
}
