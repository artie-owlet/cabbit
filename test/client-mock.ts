import EventEmitter from 'events';

import { ChannelWrapper } from '@artie-owlet/amqplib-wrapper';

let clientMock: ClientMock | undefined = undefined;
export class ClientMock extends EventEmitter {
    public calls = [] as [string, ...unknown[]][];
    public closed = false;

    private tmpId = 0;

    constructor(
        public chanWrap: ChannelWrapper<any>,
        public passive: boolean,
    ) {
        super();
        clientMock = this;
    }

    public declareExchange(...args: unknown[]): void {
        this.calls.push(['declareExchange', ...args]);
    }

    public declareQueue(...args: unknown[]): void {
        this.calls.push(['declareQueue', ...args]);
    }

    public declareTmpQueue(...args: unknown[]): number {
        this.calls.push(['declareTmpQueue', ...args]);
        return ++this.tmpId;
    }

    public bindExchange(...args: unknown[]): void {
        this.calls.push(['bindExchange', ...args]);
    }

    public bindQueue(...args: unknown[]): void {
        this.calls.push(['bindQueue', ...args]);
    }

    public restoreQueue(...args: unknown[]): void {
        this.calls.push(['restoreQueue', ...args]);
    }

    public close(): Promise<void> {
        this.closed = true;
        return Promise.resolve();
    }
}

export function getClientMock(): ClientMock | undefined {
    return clientMock;
}

export function clearClientMock(): void {
    clientMock = undefined;
}
