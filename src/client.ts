import EventEmitter from 'events';

import { ChannelWrapper } from '@artie-owlet/amqplib-wrapper';
import { Channel, ConsumeMessage as AmqplibMessage } from 'amqplib';

type PartlyRequired<T, R extends keyof T> = Required<Pick<T, R>> & Omit<T, R>;

/**
 * Represents [AMQP table](https://www.rabbitmq.com/amqp-0-9-1-reference.html#domain.table)
 */
export interface IArguments {
    [key: string]: any;
}

/**
 * Represents [exchange.declare](https://www.rabbitmq.com/amqp-0-9-1-reference.html#exchange.declare) arguments
 */
export interface IExchangeOptions {
    durable?: boolean;
    internal?: boolean;
    autoDelete?: boolean;
    arguments?: IArguments;
}

export type IExchangeOptionsStrict = PartlyRequired<IExchangeOptions, 'durable' | 'autoDelete' | 'internal'>;

/**
 * Represents [exchange.declare](https://www.rabbitmq.com/amqp-0-9-1-reference.html#queue.declare) arguments
 */
export interface IQueueDeclareOptions {
    durable?: boolean;
    autoDelete?: boolean;
    arguments?: IArguments;
}

/**
 * Represents [exchange.declare](https://www.rabbitmq.com/amqp-0-9-1-reference.html#basic.consume) arguments
 */
export interface IQueueConsumeOptions {
    consumerTag?: string;
    noAck?: boolean;
    exclusive?: boolean;
    priority?: number;
    arguments?: IArguments;
}

export interface IQueueOptions {
    declare?: IQueueDeclareOptions;
    consume?: IQueueConsumeOptions;
}

export interface IQueueOptionsStrict {
    declare: PartlyRequired<IQueueDeclareOptions, 'durable' | 'autoDelete'>;
    consume: PartlyRequired<IQueueConsumeOptions, 'noAck' | 'exclusive'>;
}

interface IExchangeData {
    exType: string;
    opts: IExchangeOptionsStrict;
    declared: boolean;
}

export interface IChannelHandler {
    chan: Channel | null;
}

type ConsumeCallback = (chanHandler: IChannelHandler, msg: AmqplibMessage | null) => void;
interface IQueueData {
    name: string;
    opts: IQueueOptionsStrict;
    cb: ConsumeCallback;
    declared: boolean;
}

interface IBinding<T> {
    src: string;
    dest: T;
    routingKey: string;
    args: IArguments | undefined;
    bound: boolean;
}
type IExchangeBinding = IBinding<string>;
type IQueueBinding = IBinding<string | number>;

type Task = (chan: Channel, chanHandler: IChannelHandler) => Promise<void>;

export class Client extends EventEmitter {
    private chanHandler: IChannelHandler = {
        chan: null,
    };
    private exchanges = new Map<string, IExchangeData>();
    private queues = new Map<string | number, IQueueData>();
    private tmpQueueId = 0;
    private exBindings = [] as IExchangeBinding[];
    private queueBindings = [] as IQueueBinding[];
    private setupPromise: Promise<void> | null = null;
    private setupTasks = [] as Task[];
    private closed = false;

    constructor(
        private chanWrap: ChannelWrapper<Channel>,
        private passive: boolean,
    ) {
        super();
        chanWrap.on('open', this.onOpen.bind(this));
    }

    public declareExchange(name: string, exType: string, options: IExchangeOptionsStrict): void {
        if (this.exchanges.has(name)) {
            throw new Error(`Exchange "${name}" already created`);
        }
        const exData: IExchangeData = {
            exType,
            opts: options,
            declared: false,
        };
        this.exchanges.set(name, exData);
        this.deferDeclareExchange(name, exData);
    }

    public declareQueue(name: string, options: IQueueOptionsStrict, cb: ConsumeCallback): void {
        if (this.queues.has(name)) {
            throw new Error(`Queue "${name}" already created`);
        }
        const queueData: IQueueData = {
            name,
            opts: options,
            cb,
            declared: false,
        };
        this.queues.set(name, queueData);
        this.deferDeclareQueue(name, queueData);
    }

    public declareTmpQueue(cb: ConsumeCallback, noAck: boolean): number {
        const queueData: IQueueData = {
            name: '',
            opts: {
                declare: {
                    durable: false,
                    autoDelete: true,
                },
                consume: {
                    noAck,
                    exclusive: true,
                }
            },
            cb,
            declared: false,
        };
        this.queues.set(++this.tmpQueueId, queueData);
        this.deferDeclareTmpQueue(queueData);
        return this.tmpQueueId;
    }

    public bindExchange(src: string, dest: string, routingKey: string, args?: IArguments): void {
        if (!this.exchanges.has(src)) {
            throw new Error(`Cannot bind: source exchange "${src}" not declared`);
        }
        if (!this.exchanges.has(dest)) {
            throw new Error(`Cannot bind: destination exchange "${dest}" not declared`);
        }
        const b: IExchangeBinding = {
            src,
            dest,
            routingKey,
            args,
            bound: false,
        };
        this.exBindings.push(b);
        this.deferBindExchange(b);
    }

    public bindQueue(exName: string, queueName: string | number, routingKey: string, args?: IArguments): void {
        if (!this.exchanges.has(exName)) {
            throw new Error(`Cannot bind: source exchange "${exName}" not declared`);
        }
        if (!this.queues.has(queueName)) {
            throw new Error(`Cannot bind: queue "${queueName}" not declared`);
        }
        const b: IQueueBinding = {
            src: exName,
            dest: queueName,
            routingKey,
            args,
            bound: false,
        };
        this.queueBindings.push(b);
        this.deferBindQueue(b);
    }

    public restoreQueue(queueName: string | number): void {
        const queue = this.queues.get(queueName);
        /* istanbul ignore next: if */
        if (!queue) {
            console.error(new Error(`BUG: Client#restoreQueue(): queue ${queueName} not declared`));
            return;
        }

        queue.declared = false;
        if (typeof queueName === 'string') {
            this.deferDeclareQueue(queueName, queue);
        } else {
            this.deferDeclareTmpQueue(queue);
        }

        this.queueBindings.filter(({dest}) => dest === queueName).forEach((b) => {
            b.bound = false;
            this.deferBindQueue(b);
        });
    }

    public close(): Promise<void> {
        this.closed = true;
        return this.chanWrap.close();
    }

    private deferDeclareExchange(name: string, exData: IExchangeData): void {
        this.deferSetup(async (chan: Channel): Promise<void> => {
            if (this.passive) {
                await chan.checkExchange(name);
            } else {
                await chan.assertExchange(name, exData.exType, exData.opts);
            }
            exData.declared = true;
        });
    }

    private deferDeclareQueue(name: string, queueData: IQueueData): void {
        this.deferSetup(async (chan: Channel, chanHandler: IChannelHandler): Promise<void> => {
            if (this.passive) {
                await chan.checkQueue(name);
            } else {
                await chan.assertQueue(name, queueData.opts.declare);
            }
            await chan.consume(name, queueData.cb.bind(null, chanHandler), queueData.opts.consume);
            queueData.declared = true;
        });
    }

    private deferDeclareTmpQueue(queueData: IQueueData): void {
        this.deferSetup(async (chan: Channel, chanHandler: IChannelHandler): Promise<void> => {
            const {queue: name} = await chan.assertQueue('', Object.assign({
                exclusive: true,
            }, queueData.opts.declare));
            queueData.name = name;
            await chan.consume(name, queueData.cb.bind(null, chanHandler), queueData.opts.consume);
            queueData.declared = true;
        });
    }

    private deferBindExchange(b: IExchangeBinding): void {
        this.deferSetup(async (chan: Channel): Promise<void> => {
            await chan.bindExchange(b.dest, b.src, b.routingKey, b.args);
            b.bound = true;
        });
    }

    private deferBindQueue(b: IQueueBinding): void {
        const queue = this.queues.get(b.dest);
        /* istanbul ignore next: if */
        if (!queue) {
            throw new Error(`BUG: Client#deferBindQueue(): queue ${b.dest} not declared`);
        }
        this.deferSetup(async (chan: Channel): Promise<void> => {
            await chan.bindQueue(queue.name, b.src, b.routingKey, b.args);
            b.bound = true;
        });
    }

    private deferSetup(task: Task): void {
        this.setupTasks.push(task);
        if (!this.setupPromise) {
            this.setupPromise = this.setup();
        }
    }

    private async setup(): Promise<void> {
        try {
            const chan = await this.chanWrap.getChannel();
            if (!chan) {
                throw new Error('Cannot create channel');
            }
            if (this.chanHandler.chan !== chan) {
                this.chanHandler.chan = null;
                this.chanHandler = {
                    chan,
                };
            }
            while (this.setupTasks.length > 0) {
                const tasks = this.setupTasks;
                this.setupTasks = [];
                for (let i = 0; i < tasks.length; ++i) {
                    await tasks[i](chan, this.chanHandler);
                }
            }
            this.emit('setup');
        } catch (err) {
            this.closed = true;
            this.emit('setupFailed', err);
        } finally {
            this.setupPromise = null;
        }
    }

    private onOpen(chan: Channel): void {
        chan.once('close', this.onClose.bind(this));
    }

    private onClose(): void {
        this.chanHandler.chan = null;

        if (!this.closed) {
            Array.from(this.exchanges.entries()).forEach(([name, exData]) => {
                exData.declared = false;
                this.deferDeclareExchange(name, exData);
            });
            Array.from(this.queues.entries()).forEach(([name, queueData]) => {
                queueData.declared = false;
                if (typeof name === 'string') {
                    this.deferDeclareQueue(name, queueData);
                } else {
                    this.deferDeclareTmpQueue(queueData);
                }
            });
            this.exBindings.forEach((b) => {
                b.bound = false;
                this.deferBindExchange(b);
            });
            this.queueBindings.forEach((b) => {
                b.bound = false;
                this.deferBindQueue(b);
            });
        }

        this.emit('close');
    }
}
