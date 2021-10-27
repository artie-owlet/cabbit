import { ConsumeMessage as AmqplibMessage } from 'amqplib';

import { Client, IArguments, IQueueOptions, IQueueOptionsStrict, IChannelHandler } from './client';
import { ContentParser } from './content-parser';
import {
    FanoutExchange,
    DirectExchange,
    TopicExchange,
    HeadersExchange,
    CustomExchange,
    IRoutingHeaders,
} from './exchange';
import { Message } from './message';

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

type Exchange = FanoutExchange | DirectExchange | TopicExchange | HeadersExchange | CustomExchange;

export class Queue<T> {
    /**
     * @hidden
     */
    public readonly name: string | number;

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

    public subscribe(ex: FanoutExchange): this;
    public subscribe(ex: DirectExchange, routingKey: string | string[]): this;
    public subscribe(ex: TopicExchange, routingKey: string | string[]): this;
    public subscribe(ex: HeadersExchange, routingHeaders: IRoutingHeaders): this;
    public subscribe(ex: CustomExchange, routingKey?: string, args?: IArguments): this;
    public subscribe(ex: Exchange, ...args: any[]): this {
        if (ex instanceof FanoutExchange) {
            ex.bind(this);
        } else if (ex instanceof DirectExchange || ex instanceof TopicExchange) {
            ex.bind(this, args[0] as string | string[]);
        } else if (ex instanceof HeadersExchange) {
            ex.bind(this, args[0] as IRoutingHeaders);
        } else {
            ex.bind(this, args[0] as string | undefined, args[1] as IArguments);
        }
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
