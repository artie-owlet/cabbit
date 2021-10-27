import { Client, IArguments, IExchangeOptions, IExchangeOptionsStrict, IQueueOptions } from './client';
import { ContentParser } from './content-parser';
import { ConsumeMiddleware, Queue } from './queue';

export interface IRoutingHeaders extends IArguments {
    'x-match': 'all' | 'any';
}

class BaseExchange {
    constructor(
        private client: Client,
        private parser: ContentParser,
        /**
         * @hidden
         */
        public readonly name: string,
        exType: string,
        opts: IExchangeOptions,
    ) {
        this.client.declareExchange(name, exType, Object.assign({
            internal: false,
            durable: true,
            autoDelete: false,
        }, opts));
    }

    protected bindImpl(dest: BaseExchange | Queue<any>, routingKey: string, args?: IArguments): void {
        if (dest instanceof BaseExchange) {
            this.client.bindExchange(this.name, dest.name, routingKey, args);
        } else {
            this.client.bindQueue(this.name, dest.name, routingKey, args);
        }
    }

    protected consumeImpl<T>(mw: ConsumeMiddleware<T>, routingKey: string, args?: IArguments): void {
        const queue = new Queue<T>(this.client, this.parser, mw, undefined);
        this.client.bindQueue(this.name, queue.name, routingKey, args);
    }

    // protected bindInternalImpl<E extends BaseExchange>(name: string, exType: string, opts: IExchangeOptions | undefined,
    //     routingKey: string, args?: IArguments): E {
    //     let ex: BaseExchange;
    //     switch (exType) {
    //         case 'fanout':
    //             ex = new FanoutExchange(this.client, this.parser, name, Object.assign({
    //                 internal: true,
    //             }, opts));
    //             break;
    //         case 'direct':
    //             ex = new DirectExchange(this.client, this.parser, name, Object.assign({
    //                 internal: true,
    //             }, opts));
    //             break;
    //         case 'topic':
    //             ex = new TopicExchange(this.client, this.parser, name, Object.assign({
    //                 internal: true,
    //             }, opts));
    //             break;
    //         case 'headers':
    //             ex = new HeadersExchange(this.client, this.parser, name, Object.assign({
    //                 internal: true,
    //             }, opts));
    //             break;
    //         default:
                // ex = new CustomExchange(this.client, this.parser, name, exType, Object.assign({
                //     internal: true,
                // }, opts));
    //     }
    //     this.client.bindExchange(this.name, name, routingKey, args);
    //     return ex;
    // }

    protected internalFanoutImpl(name: string, opts: IExchangeOptions | undefined,
        routingKey: string, args?: IArguments): FanoutExchange {
        const e = new FanoutExchange(this.client, this.parser, name, Object.assign({
            internal: true,
        }, opts));
        this.client.bindExchange(this.name, name, routingKey, args);
        return e;
    }

    protected internalDirectImpl(name: string, opts: IExchangeOptions | undefined,
        routingKey: string, args?: IArguments): DirectExchange {
        const e = new DirectExchange(this.client, this.parser, name, Object.assign({
            internal: true,
        }, opts));
        this.client.bindExchange(this.name, name, routingKey, args);
        return e;
    }

    protected internalTopicImpl(name: string, opts: IExchangeOptions | undefined,
        routingKey: string, args?: IArguments): TopicExchange {
        const e = new TopicExchange(this.client, this.parser, name, Object.assign({
            internal: true,
        }, opts));
        this.client.bindExchange(this.name, name, routingKey, args);
        return e;
    }

    protected internalHeadersImpl(name: string, opts: IExchangeOptions | undefined,
        routingKey: string, args?: IArguments): HeadersExchange {
        const e = new HeadersExchange(this.client, this.parser, name, Object.assign({
            internal: true,
        }, opts));
        this.client.bindExchange(this.name, name, routingKey, args);
        return e;
    }

    protected internalCustomImpl(name: string, exType: string, opts: IExchangeOptions | undefined,
        routingKey: string, args?: IArguments): CustomExchange {
        const e = new CustomExchange(this.client, this.parser, name, exType, Object.assign({
            internal: true,
        }, opts));
        this.client.bindExchange(this.name, name, routingKey, args);
        return e;
    }
}
