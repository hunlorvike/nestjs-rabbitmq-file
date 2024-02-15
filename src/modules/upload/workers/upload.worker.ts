// upload.worker.ts

import { Injectable } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Queues } from '../../../shared/constrains/queue.constrain';
import { Job } from 'bullmq';
import { Process } from '@nestjs/bull';

@Injectable()
@Processor(Queues.UPLOAD)
export class UploadWorker extends WorkerHost {
	
	async process(job: Job<any>, token: string | undefined): Promise<any> {
		switch (job.name) {
			case 'processUpload':
				console.log(job);
				return this.handleProcessUpload(job);
			default:
				throw new Error(`Process ${job.name} not implemented`);
		}
	}

	async handleProcessUpload(job: any): Promise<any> {
		console.log(`Processing upload job: ${job}`);
	}
}
