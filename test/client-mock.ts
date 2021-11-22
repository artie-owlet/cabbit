/* eslint-disable prefer-rest-params */
import EventEmitter from 'events';

import { ChannelWrapper } from '@artie-owlet/amqplib-wrapper';

import { CallRecorder, mixCallRecorder } from './call-recorder';

// eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-empty-interface
export interface ClientMock extends CallRecorder {}

let clientMock: ClientMock | undefined = undefined;
export class ClientMock extends EventEmitter {
    public closed = false;

    private tmpId = 0;

    constructor(
        public chanWrap: ChannelWrapper<any>,
        public passive: boolean,
    ) {
        super();
        clientMock = this;
    }

    public declareExchange(): void {
        this.recordCall(arguments);
    }

    public declareQueue(): void {
        this.recordCall(arguments);
    }

    public declareTmpQueue(): number {
        this.recordCall(arguments);
        return ++this.tmpId;
    }

    public bindExchange(): void {
        this.recordCall(arguments);
    }

    public bindQueue(): void {
        this.recordCall(arguments);
    }

    public restoreQueue(): void {
        this.recordCall(arguments);
    }

    public close(): Promise<void> {
        this.closed = true;
        return Promise.resolve();
    }
}
mixCallRecorder(ClientMock);

export function getClientMock(): ClientMock | undefined {
    return clientMock;
}

export function clearClientMock(): void {
    clientMock = undefined;
}
