import { Client, IArguments, IExchangeOptions } from './client';
import { ContentParser } from './content-parser';
import { ConsumeMiddleware, Queue } from './queue';

export type Exchange = FanoutExchange | DirectExchange | TopicExchange | HeadersExchange | CustomExchange;

/**
 * Headers for binding to the headers exchange
 */
export interface IRoutingHeaders extends IArguments {
    'x-match': 'all' | 'any';
}

class BaseExchange {
    /** @hidden */
    public readonly name: string;

    constructor(
        private client: Client,
        private parser: ContentParser,
        name: string,
        exType: string,
        opts: IExchangeOptions | undefined,
    ) {
        this.client.declareExchange(name, exType, Object.assign({
            internal: false,
            durable: true,
            autoDelete: false,
        }, opts));
        this.name = name;
    }

    protected bindImpl(dest: Exchange | Queue<any>, routingKey: string, args?: IArguments): void {
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

/**
 * Represents a fanout exchange
 */
export class FanoutExchange extends BaseExchange {
    /** @hidden */
    constructor(
        client: Client,
        parser: ContentParser,
        name: string,
        opts: IExchangeOptions | undefined,
    ) {
        super(client, parser, name, 'fanout', opts);
    }

    /**
     * Bind an exchange or queue
     */
    public bind(dest: Exchange | Queue<any>): void {
        this.bindImpl(dest, '');
    }

    /**
     * Create and bind a named queue and start consuming in the provided middleware
     */
    public consume<T>(name: string, mw: ConsumeMiddleware<T>): void;
    /**
     * Create and bind a temporary queue and start consuming in the provided middleware
     */
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

    /**
     * Create and bind an internal fanout exchange
     */
    public fanout(name: string): FanoutExchange {
        const ex = this.internalFanout(name);
        this.bind(ex);
        return ex;
    }

    /**
     * Create and bind an internal direct exchange
     */
    public direct(name: string): DirectExchange {
        const ex = this.internalDirect(name);
        this.bind(ex);
        return ex;
    }

    /**
     * Create and bind an internal topic exchange
     */
    public topic(name: string): TopicExchange {
        const ex = this.internalTopic(name);
        this.bind(ex);
        return ex;
    }

    /**
     * Create and bind an internal headers exchange
     */
    public headers(name: string): HeadersExchange {
        const ex = this.internalHeaders(name);
        this.bind(ex);
        return ex;
    }

    /**
     * Create and bind an internal exchange with custom type
     */
    public exchange(name: string, exType: string): CustomExchange {
        const ex = this.internalCustom(name, exType);
        this.bind(ex);
        return ex;
    }
}

class StringRoutingExchange extends BaseExchange {
    /** @hidden */
    constructor(
        client: Client,
        parser: ContentParser,
        name: string,
        exType: string,
        opts: IExchangeOptions | undefined,
    ) {
        super(client, parser, name, exType, opts);
    }

    /**
     * Bind an exchange or queue
     * @param routingKey Single routing key or list of routing keys
     */
    public bind(dest: Exchange | Queue<any>, routingKey: string | string[]): void {
        if (typeof routingKey === 'string') {
            routingKey = [routingKey];
        }
        routingKey.forEach(rk => this.bindImpl(dest, rk));
    }

    /**
     * Create and bind a named queue and start consuming in the provided middleware
     * @param routingKey Single routing key or list of routing keys
     */
    public consume<T>(name: string, mw: ConsumeMiddleware<T>, routingKey: string | string[]): void;
    /**
     * Create and bind a temporary queue and start consuming in the provided middleware
     * @param routingKey Single routing key or list of routing keys
     */
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

    /**
     * Create and bind an internal fanout exchange
     * @param routingKey Single routing key or list of routing keys
     */
    public fanout(name: string, routingKey: string | string[]): FanoutExchange {
        const ex = this.internalFanout(name);
        this.bind(ex, routingKey);
        return ex;
    }

    /**
     * Create and bind an internal direct exchange
     * @param routingKey Single routing key or list of routing keys
     */
    public direct(name: string, routingKey: string | string[]): DirectExchange {
        const ex = this.internalDirect(name);
        this.bind(ex, routingKey);
        return ex;
    }

    /**
     * Create and bind an internal topic exchange
     * @param routingKey Single routing key or list of routing keys
     */
    public topic(name: string, routingKey: string | string[]): TopicExchange {
        const ex = this.internalTopic(name);
        this.bind(ex, routingKey);
        return ex;
    }

    /**
     * Create and bind an internal headers exchange
     * @param routingKey Single routing key or list of routing keys
     */
    public headers(name: string, routingKey: string | string[]): HeadersExchange {
        const ex = this.internalHeaders(name);
        this.bind(ex, routingKey);
        return ex;
    }

    /**
     * Create and bind an internal exchange with custom type
     * @param routingKey Single routing key or list of routing keys
     */
    public exchange(name: string, exType: string, routingKey: string | string[]): CustomExchange {
        const ex = this.internalCustom(name, exType);
        this.bind(ex, routingKey);
        return ex;
    }
}

/**
 * Represents a direct exchange
 */
export class DirectExchange extends StringRoutingExchange {
    /** @hidden */
    constructor(
        client: Client,
        parser: ContentParser,
        name: string,
        opts: IExchangeOptions | undefined,
    ) {
        super(client, parser, name, 'direct', opts);
    }
}

/**
 * Represents a topic exchange
 */
export class TopicExchange extends StringRoutingExchange {
    /** @hidden */
    constructor(
        client: Client,
        parser: ContentParser,
        name: string,
        opts: IExchangeOptions | undefined,
    ) {
        super(client, parser, name, 'topic', opts);
    }
}

/**
 * Represents a headers exchange
 */
export class HeadersExchange extends BaseExchange {
    /** @hidden */
    constructor(
        client: Client,
        parser: ContentParser,
        name: string,
        opts: IExchangeOptions | undefined,
    ) {
        super(client, parser, name, 'headers', opts);
    }

    /**
     * Bind an exchange or queue
     */
    public bind(dest: Exchange | Queue<any>, routingHeaders: IRoutingHeaders): void {
        this.bindImpl(dest, '', routingHeaders);
    }

    /**
     * Create and bind a named queue and start consuming in the provided middleware
     */
    public consume<T>(name: string, mw: ConsumeMiddleware<T>, routingHeaders: IRoutingHeaders): void;
    /**
     * Create and bind a temporary queue and start consuming in the provided middleware
     */
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

    /**
     * Create and bind an internal fanout exchange
     */
    public fanout(name: string, routingHeaders: IRoutingHeaders): FanoutExchange {
        const ex = this.internalFanout(name);
        this.bind(ex, routingHeaders);
        return ex;
    }

    /**
     * Create and bind an internal direct exchange
     */
    public direct(name: string, routingHeaders: IRoutingHeaders): DirectExchange {
        const ex = this.internalDirect(name);
        this.bind(ex, routingHeaders);
        return ex;
    }

    /**
     * Create and bind an internal topic exchange
     */
    public topic(name: string, routingHeaders: IRoutingHeaders): TopicExchange {
        const ex = this.internalTopic(name);
        this.bind(ex, routingHeaders);
        return ex;
    }

    /**
     * Create and bind an internal headers exchange
     */
    public headers(name: string, routingHeaders: IRoutingHeaders): HeadersExchange {
        const ex = this.internalHeaders(name);
        this.bind(ex, routingHeaders);
        return ex;
    }

    /**
     * Create and bind an internal exchange with custom type
     */
    public exchange(name: string, exType: string, routingHeaders: IRoutingHeaders): CustomExchange {
        const ex = this.internalCustom(name, exType);
        this.bind(ex, routingHeaders);
        return ex;
    }
}

/**
 * Represents an exchange with custom type
 */
export class CustomExchange extends BaseExchange {
    /** @hidden */
    constructor(
        client: Client,
        parser: ContentParser,
        name: string,
        exType: string,
        opts: IExchangeOptions | undefined,
    ) {
        super(client, parser, name, exType, opts);
    }

    /**
     * Bind an exchange or queue
     */
    public bind(dest: Exchange | Queue<any>, routingKey?: string, args?: IArguments): void {
        this.bindImpl(dest, routingKey || '', args);
    }

    /**
     * Create and bind a named queue and start consuming in the provided middleware
     */
    public consume<T>(name: string, mw: ConsumeMiddleware<T>, routingKey?: string, routingArgs?: IArguments): void;
    /**
     * Create and bind a temporary queue and start consuming in the provided middleware
     */
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

    /**
     * Create and bind an internal fanout exchange
     */
    public fanout(name: string, routingKey?: string, args?: IArguments): FanoutExchange {
        const ex = this.internalFanout(name);
        this.bind(ex, routingKey, args);
        return ex;
    }

    /**
     * Create and bind an internal direct exchange
     */
    public direct(name: string, routingKey?: string, args?: IArguments): DirectExchange {
        const ex = this.internalDirect(name);
        this.bind(ex, routingKey, args);
        return ex;
    }

    /**
     * Create and bind an internal topic exchange
     */
    public topic(name: string, routingKey?: string, args?: IArguments): TopicExchange {
        const ex = this.internalTopic(name);
        this.bind(ex, routingKey, args);
        return ex;
    }

    /**
     * Create and bind an internal headers exchange
     */
    public headers(name: string, routingKey?: string, args?: IArguments): HeadersExchange {
        const ex = this.internalHeaders(name);
        this.bind(ex, routingKey, args);
        return ex;
    }

    /**
     * Create and bind an internal exchange with custom type
     */
    public exchange(name: string, exType: string, routingKey?: string, args?: IArguments): CustomExchange {
        const ex = this.internalCustom(name, exType);
        this.bind(ex, routingKey, args);
        return ex;
    }
}
