/* eslint-disable prefer-rest-params */
import EventEmitter from 'events';

import { ConsumeMessage as AmqplibMessage } from 'amqplib';
import { ChannelWrapper } from '@artie-owlet/amqplib-wrapper';

import { CallRecorder, mixCallRecorder } from './call-recorder';

// eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-empty-interface
export interface ClientMock extends CallRecorder {}

type ConsumeCallback = (chanHandler: any, msg: AmqplibMessage | null) => void;

let clientMock: ClientMock;
export class ClientMock extends EventEmitter {
    public closed = false;
    public namedConsumers = new Map<string, ConsumeCallback>();
    public tmpConsumers = [] as ConsumeCallback[];

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

    public declareQueue(name: string, _: any, cb: ConsumeCallback): void {
        this.recordCall(arguments, [2]);
        this.namedConsumers.set(name, cb);
    }

    public declareTmpQueue(cb: ConsumeCallback): number {
        this.recordCall(arguments, [0]);
        this.tmpConsumers.push(cb);
        return this.tmpConsumers.length;
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

export function getClientMock(): ClientMock {
    return clientMock;
}
