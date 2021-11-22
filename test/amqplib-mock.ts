/* eslint-disable prefer-rest-params */
import EventEmitter from 'events';

import { Connection, Channel, ConfirmChannel, Replies } from 'amqplib';

import { CallRecorder, mixCallRecorder } from './call-recorder';

export class ConnectMock {
    public connectThrows = 0;
    public connections = [] as ConnectionMock[];

    public async connect(): Promise<Connection> {
        await Promise.resolve();
        if (this.connectThrows > 0) {
            --this.connectThrows;
            throw new Error('Cannot connect');
        }
        const conn = new ConnectionMock();
        this.connections.push(conn);
        return conn as unknown as Connection;
    }
}

export class ConnectionMock extends EventEmitter {
    public connection = {
        serverProperties: {},
    };
    public closed = false;
    public createThrows = 0;
    public channels = [] as ChannelMock[];

    public async createChannel(): Promise<Channel> {
        await Promise.resolve();
        if (this.closed) {
            throw new Error('Connection closed');
        }
        if (this.createThrows > 0) {
            --this.createThrows;
            throw new Error('Cannot open');
        }
        const chan = new ChannelMock();
        this.channels.push(chan);
        return chan as unknown as Channel;
    }

    public async createConfirmChannel(): Promise<ConfirmChannel> {
        await Promise.resolve();
        if (this.closed) {
            throw new Error('Connection closed');
        }
        if (this.createThrows > 0) {
            --this.createThrows;
            throw new Error('Cannot open');
        }
        const chan = new ConfirmChannelMock();
        this.channels.push(chan);
        return chan as unknown as ConfirmChannel;
    }

    public async close(): Promise<void> {
        await Promise.resolve();
        if (this.closed) {
            throw new Error('Connection closed');
        }
        this.closed = true;
        this.channels.filter(chan => !chan.closed).forEach(chan => chan.testClose());
        this.channels = [];
        this.emit('close');
    }

    public testClose(err?: Error): void {
        this.closed = true;
        if (err) {
            this.emit('error', err);
        }
        this.channels.filter(chan => !chan.closed).forEach(chan => chan.testClose());
        this.channels = [];
        this.emit('close');
    }
}

// eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-empty-interface
export interface ChannelMock extends CallRecorder {}

export class ChannelMock extends EventEmitter {
    public fail = false;
    public closed = false;

    private tmpId = 0;
    private consumerTag = 0;

    public async assertExchange(exchange: string): Promise<Replies.AssertExchange> {
        await Promise.resolve();
        if (this.fail) {
            throw new Error('test error');
        }
        this.recordCall(arguments);
        return {
            exchange,
        };
    }

    public async checkExchange(): Promise<Replies.Empty> {
        await Promise.resolve();
        this.recordCall(arguments);
        return {};
    }

    public async bindExchange(): Promise<Replies.Empty> {
        await Promise.resolve();
        this.recordCall(arguments);
        return {};
    }

    public async assertQueue(queue: string): Promise<Replies.AssertQueue> {
        await Promise.resolve();
        const name = queue === '' ? `tmp${++this.tmpId}` : queue;
        this.recordCall(arguments);
        return {
            queue: name,
            messageCount: 0,
            consumerCount: 1,
        };
    }

    public async checkQueue(queue: string): Promise<Replies.AssertQueue> {
        await Promise.resolve();
        if (queue === '') {
            throw new Error('Cannot check unnamed queue');
        }
        this.recordCall(arguments);
        return {
            queue,
            messageCount: 0,
            consumerCount: 1,
        };
    }

    public async bindQueue(): Promise<Replies.Empty> {
        await Promise.resolve();
        this.recordCall(arguments);
        return {};
    }

    public async consume(): Promise<Replies.Consume> {
        await Promise.resolve();
        this.recordCall(arguments, [1]);
        return {
            consumerTag: `cons-${++this.consumerTag}`,
        };
    }

    public async close(): Promise<void> {
        if (this.closed) {
            throw new Error('Channel closed');
        }
        await Promise.resolve();
        this.closed = true;
        this.emit('close');
    }

    public testClose(err?: Error): void {
        this.closed = true;
        if (err) {
            this.emit('error', err);
        }
        this.emit('close');
    }
}
mixCallRecorder(ChannelMock);

export class ConfirmChannelMock extends ChannelMock {}
