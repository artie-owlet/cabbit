import { expect } from 'chai';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const amqplib = require('amqplib') as typeof import('amqplib');
import { ConnectionWrapper } from '@artie-owlet/amqplib-wrapper';

import { ConnectMock } from './amqplib-mock';
import { promisifyEvent } from './promisify-event';

import { Client } from '../src/client';

describe('Client', () => {
    let connectOrig: typeof amqplib.connect;
    let connectMock: ConnectMock;
    let connWrap: ConnectionWrapper;
    let client: Client;

    before(() => {
        connectOrig = amqplib.connect;
    });

    after(() => {
        amqplib.connect = connectOrig;
    });

    beforeEach(() => {
        connectMock = new ConnectMock();
        amqplib.connect = connectMock.connect.bind(connectMock) as unknown as typeof amqplib.connect;
        connWrap = new ConnectionWrapper({});
        const chanWrap = connWrap.createChannelWrapper();
        client  = new Client(chanWrap, false);
    });

    afterEach(async () => {
        await client.close();
    });

    const exOpts = {
        internal: false,
        durable: true,
        autoDelete: false,
    };
    const qOpts = {
        declare: {
            durable: true,
            autoDelete: false,
        },
        consume: {
            noAck: false,
            exclusive: false,
        },
    };
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const cb = () => {};

    describe('#declareExchange()', () => {
        it('should declare exchange', async () => {
            client.declareExchange('test', 'topic', exOpts);
            await promisifyEvent(client, 'setup');
            const chanMock = connectMock.connections[0].channels[0];
            expect(chanMock.calls).deep.eq([
                ['assertExchange', 'test', 'topic', exOpts],
            ]);
        });

        it('should throw if the same exchange is declared twice', () => {
            client.declareExchange('test', 'topic', exOpts);
            expect(client.declareExchange.bind(client, 'test', 'topic', exOpts)).throws(Error)
                .property('message', 'Exchange "test" already created');
        });
    });

    describe('#declareQueue()', () => {
        it('should declare queue', async () => {
            client.declareQueue('test', qOpts, cb);
            await promisifyEvent(client, 'setup');
            const chanMock = connectMock.connections[0].channels[0];
            expect(chanMock.calls).deep.eq([
                ['assertQueue', 'test', qOpts.declare],
                ['consume', 'test', cb, qOpts.consume],
            ]);
        });
    });
});
