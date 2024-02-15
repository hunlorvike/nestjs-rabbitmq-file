// rabbitmq.module.ts

import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
	imports: [
		ClientsModule.register([
			{
				name: 'RABBITMQ',
				transport: Transport.RMQ,
				options: {
					urls: ['amqp://localhost:5672'],
					queue: 'file-queue',
					queueOptions: {
						durable: false,
						noAck: false, 
						maxPriority: 10,
						prefetchCount: 1,
					},
				},
			},
		]),
	],
})
export class RabbitmqModule { }
