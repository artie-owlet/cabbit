import { Message as AmqplibMessage } from 'amqplib';

import { ChannelHandler } from './channel-handler';
import { ParseContent } from './content-parser';

export interface IMessageHeaders {
    [key: string]: any;
}

export interface IMessage<T = any> {
    /**
     * Decoded and parsed message body
     */
    readonly body?: T;
    /**
     * Describes decoding or parsing error
     */
    readonly parseError?: string;
    /**
     * Headers set by publisher
     */
    readonly appHeaders: IMessageHeaders;
    /**
     * Headers set by RabbitMQ
     */
    readonly xHeaders: IMessageHeaders;
    /**
     * Raw amqplib message
     */
    readonly amqplibMessage: AmqplibMessage;
    /**
     * Acknowledge message
     * @param allUpTo acknowledge all unacknowledged messages consumed before (default false)
     */
    ack(allUpTo?: boolean): boolean;
    /**
     * Reject message
     * @param allUpTo reject all unacknowledged messages consumed before (default false)
     * @param requeue push rejected message(s) back on the queue(s) they came from (default false)
     */
    nack(allUpTo?: boolean, requeue?: boolean): boolean;
}

export class Message<T = any> implements IMessage<T> {
    public readonly body?: T;
    public readonly parseError?: string;
    public readonly exchange: string;
    public readonly routingKey: string;
    public readonly appHeaders = {} as IMessageHeaders;
    public readonly xHeaders = {} as IMessageHeaders;

    constructor(
        public readonly amqplibMessage: AmqplibMessage,
        private chan: ChannelHandler,
        parseContent: ParseContent,
    ) {
        try {
            this.body = parseContent(amqplibMessage.content,
                amqplibMessage.properties.contentEncoding,
                amqplibMessage.properties.contentType) as T;
        } catch (err) {
            /* istanbul ignore next: else */
            this.parseError = err instanceof Error ? err.message : String(err);
        }

        this.exchange = amqplibMessage.fields.exchange;
        this.routingKey = amqplibMessage.fields.routingKey;
        for (const key in amqplibMessage.properties.headers) {
            if (key.startsWith('x-') || key.startsWith('X-')) {
                this.xHeaders[key.slice(2).toLowerCase()] = amqplibMessage.properties.headers[key] as unknown;
            } else {
                this.appHeaders[key] = amqplibMessage.properties.headers[key] as unknown;
            }
        }
    }

    public ack(allUpTo = false): boolean {
        return this.chan.ack(this.amqplibMessage, allUpTo);
    }

    public nack(allUpTo = false, requeue = false): boolean {
        return this.chan.nack(this.amqplibMessage, allUpTo, requeue);
    }
}
