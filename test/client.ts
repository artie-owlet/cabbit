import { expect } from 'chai';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const amqplib = require('amqplib') as typeof import('amqplib');
import { ConnectionWrapper, ChannelWrapper } from '@artie-owlet/amqplib-wrapper';
import { Channel } from 'amqplib';

import { ConnectMock } from './amqplib-mock';
import { promisifyEvent } from './promisify-event';

import { Client } from '../src/client';

describe('Client', () => {
    let connectOrig: typeof amqplib.connect;
    let connectMock: ConnectMock;
    let connWrap: ConnectionWrapper;
    let chanWrap: ChannelWrapper<Channel>;
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
        chanWrap = connWrap.createChannelWrapper();
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
        it('should declare named queue', async () => {
            client.declareQueue('test', qOpts, cb);
            await promisifyEvent(client, 'setup');
            const chanMock = connectMock.connections[0].channels[0];
            expect(chanMock.calls).deep.eq([
                ['assertQueue', 'test', qOpts.declare],
                ['consume', 'test', qOpts.consume],
            ]);
        });

        it('should throw if the same queue is declared twice', () => {
            client.declareQueue('test', qOpts, cb);
            expect(client.declareQueue.bind(client, 'test', qOpts, cb)).throws(Error)
                .property('message', 'Queue "test" already created');
        });
    });

    describe('#declareTmpQueue', () => {
        it('should declare tmp queue', async () => {
            client.declareTmpQueue(cb, true);
            await promisifyEvent(client, 'setup');
            const chanMock = connectMock.connections[0].channels[0];
            expect(chanMock.calls).deep.eq([
                ['assertQueue', '', {
                    durable: false,
                    autoDelete: true,
                    exclusive: true,
                }],
                ['consume', 'tmp1', {
                    noAck: true,
                    exclusive: true,
                }],
            ]);
        });
    });

    describe('#bindEchange()', () => {
        it('should bind exchange', async () => {
            client.declareExchange('test1', 'topic', exOpts);
            client.declareExchange('test2', 'topic', exOpts);
            client.bindExchange('test1', 'test2', 'testrk');
            await promisifyEvent(client, 'setup');
            const chanMock = connectMock.connections[0].channels[0];
            expect(chanMock.calls).deep.eq([
                ['assertExchange', 'test1', 'topic', exOpts],
                ['assertExchange', 'test2', 'topic', exOpts],
                ['bindExchange', 'test2', 'test1', 'testrk', undefined],
            ]);
        });

        it('should throw if source exchange not declared', () => {
            client.declareExchange('test', 'topic', exOpts);
            expect(() => client.bindExchange('test2', 'test', 'testrk'))
                .throw('Cannot bind: source exchange "test2" not declared');
        });

        it('should throw if destination exchange not declared', () => {
            client.declareExchange('test', 'topic', exOpts);
            expect(() => client.bindExchange('test', 'test2', 'testrk'))
                .throw('Cannot bind: destination exchange "test2" not declared');
        });
    });

    describe('#bindQueue()', () => {
        it('should bind named queue', async () => {
            client.declareExchange('testex', 'topic', exOpts);
            client.declareQueue('testq', qOpts, cb);
            client.bindQueue('testex', 'testq', 'testrk');
            await promisifyEvent(client, 'setup');
            const chanMock = connectMock.connections[0].channels[0];
            expect(chanMock.calls).deep.eq([
                ['assertExchange', 'testex', 'topic', exOpts],
                ['assertQueue', 'testq', qOpts.declare],
                ['consume', 'testq', qOpts.consume],
                ['bindQueue', 'testq', 'testex', 'testrk', undefined],
            ]);
        });

        it('should bind tmp queue', async () => {
            client.declareExchange('testex', 'topic', exOpts);
            const id = client.declareTmpQueue(cb, true);
            client.bindQueue('testex', id, 'testrk');
            await promisifyEvent(client, 'setup');
            const chanMock = connectMock.connections[0].channels[0];
            expect(chanMock.calls).deep.eq([
                ['assertExchange', 'testex', 'topic', exOpts],
                ['assertQueue', '', {
                    durable: false,
                    autoDelete: true,
                    exclusive: true,
                }],
                ['consume', 'tmp1', {
                    noAck: true,
                    exclusive: true,
                }],
                ['bindQueue', 'tmp1', 'testex', 'testrk', undefined],
            ]);
        });

        it('should throw if exchange not declared', () => {
            client.declareQueue('testq', qOpts, cb);
            expect(() => client.bindQueue('testex', 'testq', 'testrk'))
                .throw('Cannot bind: source exchange "testex" not declared');
        });

        it('should throw if queue not declared', () => {
            client.declareExchange('testex', 'topic', exOpts);
            expect(() => client.bindQueue('testex', 'testq', 'testrk'))
                .throw('Cannot bind: queue "testq" not declared');
        });
    });

    describe('#restoreQueue()', () => {
        it('should restore named queue and bounds', async () => {
            client.declareExchange('testex', 'topic', exOpts);
            client.declareQueue('testq', qOpts, cb);
            client.bindQueue('testex', 'testq', 'testrk');
            await promisifyEvent(client, 'setup');
            const chanMock = connectMock.connections[0].channels[0];
            chanMock.calls = [];
            client.restoreQueue('testq');
            await promisifyEvent(client, 'setup');
            expect(chanMock.calls).deep.eq([
                ['assertQueue', 'testq', qOpts.declare],
                ['consume', 'testq', qOpts.consume],
                ['bindQueue', 'testq', 'testex', 'testrk', undefined],
            ]);
        });

        it('should restore tmp queue and bounds', async () => {
            client.declareExchange('testex', 'topic', exOpts);
            const id = client.declareTmpQueue(cb, true);
            client.bindQueue('testex', id, 'testrk');
            await promisifyEvent(client, 'setup');
            const chanMock = connectMock.connections[0].channels[0];
            chanMock.calls = [];
            client.restoreQueue(id);
            await promisifyEvent(client, 'setup');
            expect(chanMock.calls).deep.eq([
                ['assertQueue', '', {
                    durable: false,
                    autoDelete: true,
                    exclusive: true,
                }],
                ['consume', 'tmp2', {
                    noAck: true,
                    exclusive: true,
                }],
                ['bindQueue', 'tmp2', 'testex', 'testrk', undefined],
            ]);
        });
    });

    describe('#close()', () => {
        it('should close ChannelWrapper', async () => {
            void client.close();
            await promisifyEvent(chanWrap, 'close');
        });
    });

    describe('#on("setupFailed")', () => {
        it('should be emitted if channel closed manually or with error', async () => {
            await chanWrap.close();
            client.declareExchange('test', 'topic', exOpts);
            const err = await promisifyEvent<Error>(client, 'setupFailed');
            expect(err.message).eq('Cannot create channel');
        });

        it('should be emitted if operation failed', async () => {
            connectMock.connections[0].channels[0].fail = true;
            client.declareExchange('test', 'topic', exOpts);
            const err = await promisifyEvent<Error>(client, 'setupFailed');
            expect(err.message).eq('test error');
        });
    });

    describe('#on("close")', () => {
        it('should be emitted on channel close', (done) => {
            client.once('close', () => done());
            const chanMock = connectMock.connections[0].channels[0];
            chanMock.testClose();
        });
    });

    describe('#onClose()', () => {
        it('should restore topology if channel closed', async () => {
            client.declareExchange('testex', 'topic', exOpts);
            client.declareExchange('testex2', 'topic', exOpts);
            client.bindExchange('testex', 'testex2', 'testrk1');
            client.declareQueue('testq', qOpts, cb);
            client.bindQueue('testex', 'testq', 'testrk2');
            const id = client.declareTmpQueue(cb, true);
            client.bindQueue('testex', id, 'testrk3');
            await promisifyEvent(client, 'setup');
            const chanMock = connectMock.connections[0].channels[0];
            chanMock.testClose();
            await promisifyEvent(client, 'setup');
            const chanMock2 = connectMock.connections[0].channels[1];
            expect(chanMock2.calls).deep.eq([
                ['assertExchange', 'testex', 'topic', exOpts],
                ['assertExchange', 'testex2', 'topic', exOpts],
                ['assertQueue', 'testq', qOpts.declare],
                ['consume', 'testq', qOpts.consume],
                ['assertQueue', '', {
                    durable: false,
                    autoDelete: true,
                    exclusive: true,
                }],
                ['consume', 'tmp1', {
                    noAck: true,
                    exclusive: true,
                }],
                ['bindExchange', 'testex2', 'testex', 'testrk1', undefined],
                ['bindQueue', 'testq', 'testex', 'testrk2', undefined],
                ['bindQueue', 'tmp1', 'testex', 'testrk3', undefined],
            ]);
        });
    });
});

describe('Client (passive mode)', () => {
    let connectOrig: typeof amqplib.connect;
    let connectMock: ConnectMock;
    let connWrap: ConnectionWrapper;
    let chanWrap: ChannelWrapper<Channel>;
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
        chanWrap = connWrap.createChannelWrapper();
        client  = new Client(chanWrap, false);
    });

    afterEach(async () => {
        await client.close();
    });

    describe('#declareExchange()', () => {
        it('should check exchange', async () => {
            const exOpts = {
                internal: false,
                durable: true,
                autoDelete: false,
            };
            client.declareExchange('test', 'topic', exOpts);
            await promisifyEvent(client, 'setup');
            const chanMock = connectMock.connections[0].channels[0];
            expect(chanWrap.chan.calls).deep.eq(['checkExchange-test']);
        });
    });
});
