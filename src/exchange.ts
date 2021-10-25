import { Client, ExchangeType } from './client';
import { ContentParser } from './content-parser';
import { ConsumeMiddleware, Queue } from './queue';
import {
    IExchangeOptions,
    IQueueOptions,
    IRoutingHeaders,
} from './types';

class BaseChannel {
    constructor(
        private client: Client,
        private parser: ContentParser,
        public readonly name: string,
        exType: ExchangeType,
        internal: boolean,
        opts: IExchangeOptions | undefined,
    ) {
        this.client.declareExchange(name, exType, Object.assign({
            internal,
            durable: true,
            autoDelete: false,
        }, opts));
    }

    protected consumeImpl
}
