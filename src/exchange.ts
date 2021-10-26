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
        const queue = new Queue<T>(this.client, this.parser, mw, )
    }
}
