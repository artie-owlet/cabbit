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
        internal: boolean,
        opts: IExchangeOptions | undefined,
    ) {
        this.client.declareExchange(name, exType, Object.assign({
            internal,
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

    protected exchangeImpl<E extends BaseExchange>(name: string, exType: string, opts: IExchangeOptions | undefined,
        routingKey: string, args?: IArguments): E {
        let ex: BaseExchange;
        switch (exType) {
            case 'fanout':
                return new FanoutExchange(this.client, this.parser, name, true, opts);
                break;
            case '':
                return new Exchange(this.client, this.parser, name, true, opts);
                break;
            case '':
                return new Exchange(this.client, this.parser, name, true, opts);
                break;
            case '':
                return new Exchange(this.client, this.parser, name, true, opts);
                break;
            default:
                return new Exchange(this.client, this.parser, name, true, opts);
        }
    }

    // protected fanoutImpl(name: string, options: IExchangeOptions | undefined,
    //     routingKey: string, args?: IArguments): FanoutExchange {
    //     const e = new FanoutExchange(this.client, this.parseContent, exchange, true, options);
    //     return this.exchangeImpl(e, routingArgs);
    // }

    // protected directImpl(name: string, options: IExchangeOptions | undefined,
    //     routingKey: string, args?: IArguments): DirectExchange {
    //     const e = new DirectExchange(this.client, this.parseContent, exchange, true, options);
    //     return this.exchangeImpl(e, routingArgs);
    // }

    // protected topicImpl(name: string, options: IExchangeOptions | undefined,
    //     routingKey: string, args?: IArguments): TopicExchange {
    //     const e = new TopicExchange(this.client, this.parseContent, exchange, true, options);
    //     return this.exchangeImpl(e, routingArgs);
    // }

    // protected headersImpl(name: string, options: IExchangeOptions | undefined,
    //     routingKey: string, args?: IArguments): HeadersExchange {
    //     const e = new HeadersExchange(this.client, this.parseContent, exchange, true, options);
    //     return this.exchangeImpl(e, routingArgs);
    // }
}
