import { expect } from 'chai';

/* eslint-disable @typescript-eslint/no-var-requires */
const amqplib = require('amqplib') as typeof import('amqplib');
const client = require('../src/client') as typeof import('../src/client');
/* eslint-enable @typescript-eslint/no-var-requires */

import { ConsumeMessage as AmqplibMessage } from 'amqplib';

import { ConnectMock } from './amqplib-mock';
import { ClientMock, getClientMock } from './client-mock';

import {
    Cabbit,
    IRoutingHeaders,
    Message,
} from '../src/index';

const routingHeaders: IRoutingHeaders = {
    'x-match': 'all',
    app: 'testapp',
};

const routingArgs = {
    id: 123,
};

const msgMock: AmqplibMessage = {
    content: Buffer.from('hello'),
    fields: {
        deliveryTag: 1,
        redelivered: false,
        exchange: '',
        routingKey: 'testrk',
        consumerTag: 'test-cons'
    },
    properties: {
        contentType: 'text/plain',
        contentEncoding: undefined,
        headers: {},
        deliveryMode: undefined,
        priority: undefined,
        correlationId: undefined,
        replyTo: undefined,
        expiration: undefined,
        messageId: undefined,
        timestamp: undefined,
        type: undefined,
        userId: undefined,
        appId: undefined,
        clusterId: undefined,
    },
};

describe('Queue', () => {
    let connectOrig: typeof amqplib.connect;
    let clientOrig: typeof client.Client;
    let connectMock: ConnectMock;
    let cabbit: Cabbit;
    let clientMock: ClientMock;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const mw = () => {};

    before(() => {
        connectOrig = amqplib.connect;
        clientOrig = client.Client;
        client.Client = ClientMock as unknown as typeof client.Client;
    });

    after(() => {
        amqplib.connect = connectOrig;
        client.Client = clientOrig;
    });

    beforeEach(function () {
        connectMock = new ConnectMock();
        amqplib.connect = connectMock.connect.bind(connectMock) as unknown as typeof amqplib.connect;

        cabbit = new Cabbit({});
        clientMock = getClientMock();
    });

    afterEach(async function () {
        await cabbit.close();
    });

    describe('#subscribe()', () => {
        it('should subscribe to exchange', () => {
            const testf = cabbit.fanout('testf');
            const testd = cabbit.direct('testd');
            const testt = cabbit.direct('testt');
            const testh = cabbit.headers('testh');
            const testc = cabbit.exchange('testc', 'mytype');
            const queue = cabbit.queue('testq', mw);
            clientMock.calls = [];
            queue.subscribe(testf)
                .subscribe(testd, 'testrk')
                .subscribe(testt, 'testrk2')
                .subscribe(testh, routingHeaders)
                .subscribe(testc, 'testrk3', routingArgs);
            expect(clientMock.calls).deep.eq([
                ['bindQueue', 'testf', 'testq', '', undefined],
                ['bindQueue', 'testd', 'testq', 'testrk', undefined],
                ['bindQueue', 'testt', 'testq', 'testrk2', undefined],
                ['bindQueue', 'testh', 'testq', '', routingHeaders],
                ['bindQueue', 'testc', 'testq', 'testrk3', routingArgs],
            ]);
        });
    });

    describe('#onMessage()', () => {
        it('should handle messages', (done) => {
            cabbit.queue((msg: Message<string>) => {
                expect(msg.body).eq('hello');
                done();
            });
            clientMock.tmpConsumers[0]({}, msgMock);
        });

        it('should restore queue if canceled', () => {
            cabbit.queue(mw);
            clientMock.calls = [];
            clientMock.tmpConsumers[0]({}, null);
            expect(clientMock.calls).deep.eq([
                ['restoreQueue', 1],
            ]);
        });
    });
});
