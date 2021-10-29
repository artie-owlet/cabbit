import EventEmitter from 'events';
import { URL } from 'url';

import { ConnectionWrapper, IConnectOptions } from '@artie-owlet/amqplib-wrapper';

import { Client, IExchangeOptions, IQueueOptions } from './client';
import { ContentDecoder, ContentMimeTypeParser, ContentParser } from './content-parser';
import { FanoutExchange, DirectExchange, TopicExchange, HeadersExchange, CustomExchange } from './exchange';
import { Message } from './message';
import { ConsumeMiddleware, Queue } from './queue';

/**
 * Extends IConnectOptions from [amqplib-wrapper](https://artie-owlet.github.io/amqplib-wrapper/interfaces/IConnectOptions.html)
 */
export interface ICabbitOptions extends IConnectOptions {
    /**
     * Declare exchanges and queues with `passive` option
     */
    passive?: boolean;
}

export interface ICabbitEvents {
    close: () => void;
    error: (err: Error) => void;
    setup: () => void;
    setupFailed: (err: Error) => void;
    unhandledMessage: (msg: Message<any>, queue: string | number) => void;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface Cabbit {
    on<E extends keyof ICabbitEvents>(event: E, listener: ICabbitEvents[E]): this;
    once<E extends keyof ICabbitEvents>(event: E, listener: ICabbitEvents[E]): this;
    addListener<E extends keyof ICabbitEvents>(event: E, listener: ICabbitEvents[E]): this;
    prependListener<E extends keyof ICabbitEvents>(event: E, listener: ICabbitEvents[E]): this;
    prependOnceListener<E extends keyof ICabbitEvents>(event: E, listener: ICabbitEvents[E]): this;
}

export class Cabbit extends EventEmitter {
    private conn?: ConnectionWrapper;
    private client: Client;
    private contentParser = new ContentParser();

    /**
     * Start work, use existing connection
     * @param conn see [amqplib-wrapper](https://artie-owlet.github.io/amqplib-wrapper/classes/ConnectionWrapper.html)
     * @param passive see {@link IConsumeManagerOptions.passive}
     */
    constructor(conn: ConnectionWrapper, passive?: boolean);
    /**
     * Start work, create own connection
     * @param connectOptions
     * @param socketOptions
     */
    constructor(connectOptions: string | ICabbitOptions, socketOptions?: any);
    constructor(...args: any[]) {
        super();

        let conn: ConnectionWrapper;
        let passive: boolean;
        if (args[0] instanceof ConnectionWrapper) {
            conn = args[0];
            passive = args[1] === undefined ? false : args[1] as boolean;
        } else {
            const opts = args[0] as string | ICabbitOptions;
            conn = new ConnectionWrapper(opts, args[1]);
            this.conn = conn;
            conn.on('error', err => this.emit('error', err));

            if (typeof opts === 'string') {
                const url = new URL(opts);
                if (url.searchParams.has('passive')) {
                    passive = Boolean(url.searchParams.get('passive'));
                } else {
                    passive = false;
                }
            } else {
                passive = opts.passive === undefined ? false : opts.passive;
            }
        }
        const chan = conn.createChannelWrapper();
        chan.on('error', err => this.emit('error', err));

        this.client = new Client(chan, passive);
        this.client.on('setup', () => this.emit('setup'));
        this.client.on('setupFailed', err => this.emit('setupFailed', err));
        this.client.on('unhandledMessage', (msg, queue) => this.emit('unhandledMessage', msg, queue));
        this.client.on('close', () => this.emit('close'));
    }

    /**
     * Create named queue and start consume to provided middleware
     */
    public queue<T = any>(name: string, mw: ConsumeMiddleware<T>, opts?: IQueueOptions): Queue<T>;
    /**
     * Create temporary queue and start consume to provided middleware
     */
    public queue<T = any>(mw: ConsumeMiddleware<T>, noAck?: boolean): Queue<T>;
    public queue<T = any>(...args: any[]): Queue<T> {
        if (typeof args[0] === 'string') {
            const name = args[0];
            const mw = args[1] as ConsumeMiddleware<T>;
            const opts = args[2] as IQueueOptions | undefined;
            return new Queue<T>(this.client, this.contentParser, name, mw, opts);
        } else {
            const mw = args[0] as ConsumeMiddleware<T>;
            const noAck = args[1] as boolean | undefined;
            return new Queue<T>(this.client, this.contentParser, mw, noAck);
        }
    }

    /**
     * Create fanout exchange
     */
    public fanout(name: string, options?: IExchangeOptions): FanoutExchange {
        return new FanoutExchange(this.client, this.contentParser, name, options);
    }

    /**
     * Create direct exchange
     */
    public direct(name: string, options?: IExchangeOptions): DirectExchange {
        return new DirectExchange(this.client, this.contentParser, name, options);
    }

    /**
     * Create topic exchange
     */
    public topic(name: string, options?: IExchangeOptions): TopicExchange {
        return new TopicExchange(this.client, this.contentParser, name, options);
    }

    /**
     * Create headers exchange
     */
    public headers(name: string, options?: IExchangeOptions): HeadersExchange {
        return new HeadersExchange(this.client, this.contentParser, name, options);
    }

    /**
     * Create exchange with custom type
     */
    public exchange(name: string, exType: string, options?: IExchangeOptions): CustomExchange {
        return new CustomExchange(this.client, this.contentParser, name, exType, options);
    }

    /**
     * Finish work, close underlying channel
     */
    public async close(): Promise<void> {
        if (this.conn) {
            await this.client.close();
            return this.conn.close();
        }
        return this.client.close();
    }

    /**
     * Set decoder for messages with specified encoding
     */
    public setDecoder(encoding: string, decode: ContentDecoder): void {
        this.contentParser.setDecoder(encoding, decode);
    }

    /**
     * Set decoder for mesages with unknown encoding
     */
    public setDefaultDecoder(decode: ContentDecoder): void {
        this.contentParser.setDefaultDecoder(decode);
    }

    /**
     * Set parser for messages with specified MIME type
     */
    public setParser(mimeType: string, parse: ContentMimeTypeParser): void {
        this.contentParser.setParser(mimeType, parse);
    }

    /**
     * Set parser for messages with unknown MIME type
     */
    public setDefaultParser(parse: ContentMimeTypeParser): void {
        this.contentParser.setDefaultParser(parse);
    }
}
