// upload.module.ts
import { Module } from '@nestjs/common';
import { UploadController } from './controllers/upload.controller';
import { UploadService } from './services/upload.service';
import { UploadWorker } from './workers/upload.worker';
import { BullModule } from '@nestjs/bullmq';
import { Queues } from '../../shared/constrains/queue.constrain';
import { ResponseInterceptor } from '../../shared/interceptors/response.interceptor';

@Module({
    imports: [
        BullModule.registerQueue({
            name: Queues.UPLOAD,
        })
    ],
    controllers: [UploadController],
    providers: [UploadService, UploadWorker, ResponseInterceptor], 
})
export class UploadModule {
}
