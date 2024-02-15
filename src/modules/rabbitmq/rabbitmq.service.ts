import { Injectable } from "@nestjs/common";
import { ClientProxy, ClientProxyFactory, Transport } from "@nestjs/microservices";
import { Queues } from "../../shared/constrains/constrain";
import { connect, Channel } from 'amqplib';

@Injectable()
export class RabbitmqService {
    private client: ClientProxy;

    constructor() {
        this.client = ClientProxyFactory.create({
            transport: Transport.RMQ,
            options: {
                urls: ['amqp://rabbitmq_user:rabbitmq_password@localhost:5672'],
                queue: Queues.FILE_QUEUE,
                queueOptions: {
                    durable: false,
                },
            },
        });
    }

    async sendMessage(message: any): Promise<void> {
        const connection = await connect('amqp://rabbitmq_user:rabbitmq_password@localhost:5672');
        const channel = await connection.createChannel();

        await channel.assertQueue(Queues.FILE_QUEUE, { durable: false });

        const messageString = JSON.stringify(message);

        channel.sendToQueue(Queues.FILE_QUEUE, Buffer.from(messageString));

        await channel.close();
        await connection.close();
    }


}