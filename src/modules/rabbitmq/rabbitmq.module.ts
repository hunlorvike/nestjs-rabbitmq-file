import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { Queues } from '../../shared/constrains/constrain';
import { RabbitmqService } from './rabbitmq.service';
import * as dotenv from 'dotenv';
dotenv.config();

@Module({
	imports: [
		ClientsModule.registerAsync([
			{
				name: 'RABBITMQ_UPLOAD',
				useFactory: async () => ({
					transport: Transport.RMQ,
					options: {
						urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
						queue: Queues.UPLOAD,
						queueOptions: {
							durable: false,
							noAck: false,
							maxPriority: 10,
							prefetchCount: 1,
						},
					},
				}),
			},
			{
				name: 'RABBITMQ_DOWNLOAD',
				useFactory: async () => ({
					transport: Transport.RMQ,
					options: {
						urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
						queue: Queues.DOWNLOAD,
						queueOptions: {
							durable: false,
							noAck: false,
							maxPriority: 10,
							prefetchCount: 1,
						},
					},
				}),
			},
		]),
	],
	providers: [RabbitmqService],
	exports: [RabbitmqService],
})
export class RabbitmqModule { }
