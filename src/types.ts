import { Options as AmqplibOptions } from 'amqplib';
import { IConnectOptions } from '@artie-owlet/amqplib-wrapper';

import { ContentDecoder, ContentMimeTypeParser } from './content-parser';
import { IMessage, IMessageHeaders } from './message';

export type IExchangeOptions = Pick<AmqplibOptions.AssertExchange, 'internal' | 'durable' | 'autoDelete'>;

export type IQueueDeclareOptions = Pick<AmqplibOptions.AssertQueue, 'durable' | 'autoDelete'>;
export type IQueueConsumeOptions = Pick<AmqplibOptions.Consume, 'consumerTag' | 'noAck' | 'exclusive' | 'priority'>;
export interface IQueueOptions {
    declare?: IQueueDeclareOptions;
    consume?: IQueueConsumeOptions;
}

export type ConsumeMiddleware<T> = (msg: IMessage<T>) => void;

export interface IRoutingHeaders extends IMessageHeaders {
    'x-match': 'all' | 'any';
}

export interface ICabbit extends ICabbitBase {
    queue(): IQueue;
    /**
     * Create fanout exchange
     */
    fanout(exchange: string, options?: IExchangeOptions): IFanoutExchange;
    /**
     * Create direct exchange
     */
    direct(exchange: string, options?: IExchangeOptions): IDirectExchange;
    /**
     * Create topic exchange
     */
    topic(exchange: string, options?: IExchangeOptions): ITopicExchange;
    /**
     * Create headers exchange
     */
    headers(exchange: string, options?: IExchangeOptions): IHeadersExchange;
    /**
     * Finish work, close underlying channel
     */
    close(): Promise<void>;

    /**
     * Set decoder for messages with specified encoding
     */
    setDecoder(encoding: string, decode: ContentDecoder): void;
    /**
     * Set decoder for mesages with unknown encoding
     */
    setDefaultDecoder(decode: ContentDecoder): void;
    /**
     * Set parser for messages with specified MIME type
     */
    setParser(mimeType: string, parse: ContentMimeTypeParser): void;
    /**
     * Set parser for messages with unknown MIME type
     */
    setDefaultParser(parse: ContentMimeTypeParser): void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IQueue {}
