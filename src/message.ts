import { ConsumeMessage as AmqplibMessage, ConsumeMessageFields, MessageProperties } from 'amqplib';

import { IChannelHandler } from './client';
import { ContentParser } from './content-parser';

export class Message<T> {
    /**
     * Decoded and parsed message body
     */
    public readonly body?: T;
    /**
     * Describes decoding or parsing error
     */
    public readonly parseError?: string;
    /**
     * Message fields
     */
    public readonly fields: ConsumeMessageFields;
    /**
     * Message properties
     */
    public readonly properties: MessageProperties;
    /**
     * Raw message content
     */
    public readonly rawContent: Buffer;

    /**
     * @hidden
     */
    constructor(
        private amqplibMessage: AmqplibMessage,
        private chanHandler: IChannelHandler,
        parser: ContentParser,
    ) {
        try {
            this.body = parser.parse(amqplibMessage.content,
                amqplibMessage.properties.contentEncoding as string | undefined,
                amqplibMessage.properties.contentType as string | undefined) as T;
        } catch (err) {
            /* istanbul ignore next: else */
            this.parseError = err instanceof Error ? err.message : String(err);
        }

        this.fields = amqplibMessage.fields;
        this.properties = amqplibMessage.properties;
        this.rawContent = amqplibMessage.content;
    }

    /**
     * Acknowledge message
     * @param allUpTo acknowledge all unacknowledged messages consumed before (default false)
     */
    public ack(allUpTo = false): boolean {
        if (this.chanHandler.chan) {
            this.chanHandler.chan.ack(this.amqplibMessage, allUpTo);
            return true;
        }
        return false;
    }

    /**
     * Reject message
     * @param allUpTo reject all unacknowledged messages consumed before (default false)
     * @param requeue push rejected message(s) back on the queue(s) they came from (default false)
     */
    public nack(allUpTo = false, requeue = false): boolean {
        if (this.chanHandler.chan) {
            this.chanHandler.chan.nack(this.amqplibMessage, allUpTo, requeue);
            return true;
        }
        return false;
    }
}
