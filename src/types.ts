import { Options as AmqplibOptions } from 'amqplib';

export type IExchangeOptions = Pick<AmqplibOptions.AssertExchange, 'internal' | 'durable' | 'autoDelete' | 'arguments'>;

export type IQueueDeclareOptions = Pick<AmqplibOptions.AssertQueue, 'durable' | 'autoDelete' | 'arguments'>;
export type IQueueConsumeOptions =
    Pick<AmqplibOptions.Consume, 'consumerTag' | 'noAck' | 'exclusive' | 'priority' | 'arguments'>;
export interface IQueueOptions {
    declare?: IQueueDeclareOptions;
    consume?: IQueueConsumeOptions;
}

export interface IArguments {
    [key: string]: any;
}

export interface IRoutingHeaders extends IArguments {
    'x-match': 'all' | 'any';
}
