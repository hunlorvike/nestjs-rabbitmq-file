// upload.service.ts
import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';
import { Queues } from '../../../shared/constrains/queue.constrain';
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class UploadService {
  constructor(
    @InjectQueue(Queues.UPLOAD) private readonly uploadBullMQ: Queue) { }

  async processUpload(data: any): Promise<any> {
    await this.uploadBullMQ.add('processUpload');
  }
}
