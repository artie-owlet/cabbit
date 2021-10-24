import { ConsumeMessage as AmqplibMessage } from 'amqplib';

import { Client, IQueueOptionsStrict } from './client';
import { ContentParser } from './content-parser';
import { FanoutExchange, DirectExchange, TopicExchange, HeadersExchange, CustomExchange } from './exchange';
import { IChannelHandler, Message } from './message';
import { IQueueOptions, IRoutingHeaders, IArguments } from './types';

export type ConsumeMiddleware<T> = (msg: Message<T>) => void;

function mergeQueueOpts(opts: IQueueOptions | undefined, defaultOpts: IQueueOptionsStrict): IQueueOptionsStrict {
    if (!opts) {
        return defaultOpts;
    }
    return {
        declare: opts.declare ? Object.assign({}, defaultOpts.declare, opts.declare) : defaultOpts.declare,
        consume: opts.consume ? Object.assign({}, defaultOpts.consume, opts.consume) : defaultOpts.consume,
    };
}

const namedQueueOptions: IQueueOptionsStrict = {
    declare: {
        durable: true,
        autoDelete: false,
    },
    consume: {
        noAck: false,
        exclusive: false,
    },
};

export class Queue<T> {
    private readonly name: string | number;
    private middleware: ConsumeMiddleware<T>;

    /**
     * @hidden
     */
    constructor(client: Client, parser: ContentParser, name: string, mw: ConsumeMiddleware<T>,
        opts: IQueueOptions | undefined);
    /**
     * @hidden
     */
    constructor(client: Client, parser: ContentParser, mw: ConsumeMiddleware<T>, noAck: boolean | undefined);
    constructor(
        private client: Client,
        private parser: ContentParser,
        ...args: any[]) {
        if (typeof args[0] === 'string') {
            this.name = args[0];
            this.middleware = args[1] as ConsumeMiddleware<T>;
            this.client.declareQueue(this.name, mergeQueueOpts(args[2] as IQueueOptions, namedQueueOptions),
                this.onMessage.bind(this));
        } else {
            this.middleware = args[0] as ConsumeMiddleware<T>;
            const noAck = args[1] as boolean | undefined;
            this.name = this.client.declareTmpQueue(this.onMessage.bind(this), noAck === undefined ? true : noAck);
        }
    }

    public subscribeFanout(ex: FanoutExchange): this {
        return this;
    }

    public subscribeDirect(ex: DirectExchange, routingKey: string | string[]): this {
        return this;
    }

    public subscribeTopic(ex: TopicExchange, routingKey: string | string[]): this {
        return this;
    }

    public subscribeHeaders(ex: HeadersExchange, routingHeaders: IRoutingHeaders): this {
        return this;
    }

    public subscribe(ex: CustomExchange, routingKey: string, args: IArguments): this {
        return this;
    }

    private onMessage(chanHandler: IChannelHandler, amqplibMessage: AmqplibMessage | null): void {
        if (!amqplibMessage) {
            this.client.restoreQueue(this.name);
            return;
        }

        const msg = new Message<T>(amqplibMessage, chanHandler, this.parser);
        this.middleware(msg);
    }
}
