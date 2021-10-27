import { Client, IArguments, IExchangeOptions } from './client';
import { ContentParser } from './content-parser';
import { ConsumeMiddleware, Queue } from './queue';

export interface IRoutingHeaders extends IArguments {
    'x-match': 'all' | 'any';
}

class BaseExchange {
    constructor(
        private client: Client,
        private parser: ContentParser,
        public readonly name: string,
        exType: string,
        opts: IExchangeOptions | undefined,
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

    protected namedQueue<T>(name: string, mw: ConsumeMiddleware<T>): Queue<T> {
        return new Queue<T>(this.client, this.parser, name, mw, undefined);
    }

    protected tmpQueue<T>(mw: ConsumeMiddleware<T>): Queue<T> {
        return new Queue<T>(this.client, this.parser, mw, undefined);
    }

    protected internalFanout(name: string): FanoutExchange {
        return new FanoutExchange(this.client, this.parser, name, { internal: true });
    }

    protected internalDirect(name: string): DirectExchange {
        return new DirectExchange(this.client, this.parser, name, { internal: true });
    }

    protected internalTopic(name: string): TopicExchange {
        return new TopicExchange(this.client, this.parser, name, { internal: true });
    }

    protected internalHeaders(name: string): HeadersExchange {
        return new HeadersExchange(this.client, this.parser, name, { internal: true });
    }

    protected internalCustom(name: string, exType: string): CustomExchange {
        return new CustomExchange(this.client, this.parser, name, exType, { internal: true });
    }
}

export class FanoutExchange extends BaseExchange {
    constructor(
        client: Client,
        parser: ContentParser,
        name: string,
        opts: IExchangeOptions | undefined,
    ) {
        super(client, parser, name, 'fanout', opts);
    }

    public bind(dest: BaseExchange | Queue<any>): void {
        this.bindImpl(dest, '');
    }

    public consume<T>(name: string, mw: ConsumeMiddleware<T>): void;
    public consume<T>(mw: ConsumeMiddleware<T>): void;
    public consume<T>(...args: any[]): void {
        let queue: Queue<T>;
        if (typeof args[0] === 'string') {
            queue = this.namedQueue<T>(args[0], args[1] as ConsumeMiddleware<T>);
        } else {
            queue = this.tmpQueue<T>(args[0] as ConsumeMiddleware<T>);
        }
        this.bind(queue);
    }

    public fanout(name: string): FanoutExchange {
        const ex = this.internalFanout(name);
        this.bind(ex);
        return ex;
    }

    public direct(name: string): DirectExchange {
        const ex = this.internalDirect(name);
        this.bind(ex);
        return ex;
    }

    public topic(name: string): TopicExchange {
        const ex = this.internalTopic(name);
        this.bind(ex);
        return ex;
    }

    public headers(name: string): HeadersExchange {
        const ex = this.internalHeaders(name);
        this.bind(ex);
        return ex;
    }

    public exchange(name: string, exType: string): CustomExchange {
        const ex = this.internalCustom(name, exType);
        this.bind(ex);
        return ex;
    }
}

class StringRoutingExchange extends BaseExchange {
    constructor(
        client: Client,
        parser: ContentParser,
        name: string,
        exType: string,
        opts: IExchangeOptions | undefined,
    ) {
        super(client, parser, name, exType, opts);
    }

    public bind(dest: BaseExchange | Queue<any>, routingKey: string | string[]): void {
        if (typeof routingKey === 'string') {
            routingKey = [routingKey];
        }
        routingKey.forEach(rk => this.bindImpl(dest, rk));
    }

    public consume<T>(name: string, mw: ConsumeMiddleware<T>, routingKey: string | string[]): void;
    public consume<T>(mw: ConsumeMiddleware<T>, routingKey: string | string[]): void;
    public consume<T>(...args: any[]): void {
        let queue: Queue<T>;
        let routingKey: string | string[];
        if (typeof args[0] === 'string') {
            queue = this.namedQueue<T>(args[0], args[1] as ConsumeMiddleware<T>);
            routingKey = args[2] as string | string[];
        } else {
            queue = this.tmpQueue<T>(args[0] as ConsumeMiddleware<T>);
            routingKey = args[1] as string | string[];
        }
        this.bind(queue, routingKey);
    }

    public fanout(name: string, routingKey: string | string[]): FanoutExchange {
        const ex = this.internalFanout(name);
        this.bind(ex, routingKey);
        return ex;
    }

    public direct(name: string, routingKey: string | string[]): DirectExchange {
        const ex = this.internalDirect(name);
        this.bind(ex, routingKey);
        return ex;
    }

    public topic(name: string, routingKey: string | string[]): TopicExchange {
        const ex = this.internalTopic(name);
        this.bind(ex, routingKey);
        return ex;
    }

    public headers(name: string, routingKey: string | string[]): HeadersExchange {
        const ex = this.internalHeaders(name);
        this.bind(ex, routingKey);
        return ex;
    }

    public exchange(name: string, exType: string, routingKey: string | string[]): CustomExchange {
        const ex = this.internalCustom(name, exType);
        this.bind(ex, routingKey);
        return ex;
    }
}

export class DirectExchange extends StringRoutingExchange {
    constructor(
        client: Client,
        parser: ContentParser,
        name: string,
        opts: IExchangeOptions | undefined,
    ) {
        super(client, parser, name, 'direct', opts);
    }
}

export class TopicExchange extends StringRoutingExchange {
    constructor(
        client: Client,
        parser: ContentParser,
        name: string,
        opts: IExchangeOptions | undefined,
    ) {
        super(client, parser, name, 'topic', opts);
    }
}

export class HeadersExchange extends BaseExchange {
    constructor(
        client: Client,
        parser: ContentParser,
        name: string,
        opts: IExchangeOptions | undefined,
    ) {
        super(client, parser, name, 'headers', opts);
    }

    public bind(dest: BaseExchange | Queue<any>, routingHeaders: IRoutingHeaders): void {
        this.bindImpl(dest, '', routingHeaders);
    }

    public consume<T>(name: string, mw: ConsumeMiddleware<T>, routingHeaders: IRoutingHeaders): void;
    public consume<T>(mw: ConsumeMiddleware<T>, routingHeaders: IRoutingHeaders): void;
    public consume<T>(...args: any[]): void {
        let queue: Queue<T>;
        let routingHeaders: IRoutingHeaders;
        if (typeof args[0] === 'string') {
            queue = this.namedQueue<T>(args[0], args[1] as ConsumeMiddleware<T>);
            routingHeaders = args[2] as IRoutingHeaders;
        } else {
            queue = this.tmpQueue<T>(args[0] as ConsumeMiddleware<T>);
            routingHeaders = args[1] as IRoutingHeaders;
        }
        this.bind(queue, routingHeaders);
    }

    public fanout(name: string, routingHeaders: IRoutingHeaders): FanoutExchange {
        const ex = this.internalFanout(name);
        this.bind(ex, routingHeaders);
        return ex;
    }

    public direct(name: string, routingHeaders: IRoutingHeaders): DirectExchange {
        const ex = this.internalDirect(name);
        this.bind(ex, routingHeaders);
        return ex;
    }

    public topic(name: string, routingHeaders: IRoutingHeaders): TopicExchange {
        const ex = this.internalTopic(name);
        this.bind(ex, routingHeaders);
        return ex;
    }

    public headers(name: string, routingHeaders: IRoutingHeaders): HeadersExchange {
        const ex = this.internalHeaders(name);
        this.bind(ex, routingHeaders);
        return ex;
    }

    public exchange(name: string, exType: string, routingHeaders: IRoutingHeaders): CustomExchange {
        const ex = this.internalCustom(name, exType);
        this.bind(ex, routingHeaders);
        return ex;
    }
}

export class CustomExchange extends BaseExchange {
    constructor(
        client: Client,
        parser: ContentParser,
        name: string,
        exType: string,
        opts: IExchangeOptions | undefined,
    ) {
        super(client, parser, name, exType, opts);
    }

    public bind(dest: BaseExchange | Queue<any>, routingKey?: string, args?: IArguments): void {
        this.bindImpl(dest, routingKey || '', args);
    }

    public consume<T>(name: string, mw: ConsumeMiddleware<T>, routingKey?: string, routingArgs?: IArguments): void;
    public consume<T>(mw: ConsumeMiddleware<T>, routingKey?: string, routingArgs?: IArguments): void;
    public consume<T>(...args: any[]): void {
        let queue: Queue<T>;
        let routingKey: string | undefined;
        let routingArgs: IArguments | undefined;
        if (typeof args[0] === 'string') {
            queue = this.namedQueue<T>(args[0], args[1] as ConsumeMiddleware<T>);
            routingKey = args[2] as string | undefined;
            routingArgs = args[3] as IArguments | undefined;
        } else {
            queue = this.tmpQueue<T>(args[0] as ConsumeMiddleware<T>);
            routingKey = args[1] as string | undefined;
            routingArgs = args[2] as IArguments | undefined;
        }
        this.bind(queue, routingKey, routingArgs);
    }

    public fanout(name: string, routingKey?: string, args?: IArguments): FanoutExchange {
        const ex = this.internalFanout(name);
        this.bind(ex, routingKey, args);
        return ex;
    }

    public direct(name: string, routingKey?: string, args?: IArguments): DirectExchange {
        const ex = this.internalDirect(name);
        this.bind(ex, routingKey, args);
        return ex;
    }

    public topic(name: string, routingKey?: string, args?: IArguments): TopicExchange {
        const ex = this.internalTopic(name);
        this.bind(ex, routingKey, args);
        return ex;
    }

    public headers(name: string, routingKey?: string, args?: IArguments): HeadersExchange {
        const ex = this.internalHeaders(name);
        this.bind(ex, routingKey, args);
        return ex;
    }

    public exchange(name: string, exType: string, routingKey?: string, args?: IArguments): CustomExchange {
        const ex = this.internalCustom(name, exType);
        this.bind(ex, routingKey, args);
        return ex;
    }
}
