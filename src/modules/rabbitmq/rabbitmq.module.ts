// rabbitmq.module.ts
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { Queues } from '../../shared/constrains/constrain';
import { RabbitmqService } from './rabbitmq.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'RABBITMQ',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://rabbitmq_user:rabbitmq_password@localhost:5672'],
          queue: Queues.FILE_QUEUE,
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
  providers: [RabbitmqService],
  exports: [RabbitmqService],
})
export class RabbitmqModule {}
