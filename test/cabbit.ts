import { expect } from 'chai';

/* eslint-disable @typescript-eslint/no-var-requires */
const amqplib = require('amqplib') as typeof import('amqplib');
const client = require('../src/client') as typeof import('../src/client');
const parser = require('../src/content-parser') as typeof import('../src/content-parser');
/* eslint-enable @typescript-eslint/no-var-requires */

import { ConnectionWrapper } from '@artie-owlet/amqplib-wrapper';

import { ConnectMock } from './amqplib-mock';
import { ClientMock, getClientMock } from './client-mock';
import { ParserMock, getParserMock } from './parser-mock';
import { promisifyEvent } from './promisify-event';

import {
    Cabbit,
    FanoutExchange,
    DirectExchange,
    TopicExchange,
    HeadersExchange,
    CustomExchange,
    Queue,
} from '../src/index';

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

function testDecoder(buf: Buffer): Buffer {
    return buf;
}

function testParser(buf: Buffer): any {
    return buf;
}

describe('Cabbit', () => {
    let connectOrig: typeof amqplib.connect;
    let clientOrig: typeof client.Client;
    let connectMock: ConnectMock;

    before(() => {
        connectOrig = amqplib.connect;
        clientOrig = client.Client;
        client.Client = ClientMock as unknown as typeof client.Client;
    });

    after(() => {
        amqplib.connect = connectOrig;
        client.Client = clientOrig;
    });

    beforeEach(() => {
        connectMock = new ConnectMock();
        amqplib.connect = connectMock.connect.bind(connectMock) as unknown as typeof amqplib.connect;
    });

    describe('constructor', () => {
        it('should use existing ConnectionWrapper', async () => {
            const connWrap = new ConnectionWrapper({});
            const cabbit = new Cabbit(connWrap);
            const clientMock = getClientMock();
            const chan = await promisifyEvent(clientMock.chanWrap, 'open');
            expect(chan).eq(connectMock.connections[0].channels[0]);
            expect(clientMock.passive).eq(false);
            await cabbit.close();
            await connWrap.close();
        });

        it('should create own ConnectionWrapper', async () => {
            const cabbit = new Cabbit({});
            const clientMock = getClientMock();
            const chan = await promisifyEvent(clientMock.chanWrap, 'open');
            expect(chan).eq(connectMock.connections[0].channels[0]);
            expect(clientMock.passive).eq(false);
            await cabbit.close();
        });

        it('should accept passive as 2nd argument', async () => {
            const connWrap = new ConnectionWrapper({});
            const cabbit = new Cabbit(connWrap, true);
            const clientMock = getClientMock();
            expect(clientMock.passive).eq(true);
            await cabbit.close();
            await connWrap.close();
        });

        it('should accept passive from options', async () => {
            const cabbit = new Cabbit({
                passive: true,
            });
            const clientMock = getClientMock();
            expect(clientMock.passive).eq(true);
            await cabbit.close();
        });

        it('should accept passive from URL', async () => {
            const cabbit = new Cabbit('amqp://localhost/?passive');
            const clientMock = getClientMock();
            expect(clientMock.passive).eq(true);
            await cabbit.close();
        });
    });

    describe('#close()', () => {
        it('should close client and own connection', async () => {
            const cabbit = new Cabbit({});
            const clientMock = getClientMock();
            await cabbit.close();
            expect(clientMock.closed).eq(true);
            expect(connectMock.connections[0].closed).eq(true);
        });

        it('should close client and should not close foreign connection', async () => {
            const connWrap = new ConnectionWrapper({});
            const cabbit = new Cabbit(connWrap);
            const clientMock = getClientMock();
            await cabbit.close();
            expect(clientMock.closed).eq(true);
            expect(connectMock.connections[0].closed).eq(false);
            await connWrap.close();
        });
    });
});

describe('Cabbit', () => {
    let connectOrig: typeof amqplib.connect;
    let clientOrig: typeof client.Client;
    let parserOrig: typeof parser.ContentParser;
    let connectMock: ConnectMock;
    let cabbit: Cabbit;
    let clientMock: ClientMock;
    let parserMock: ParserMock;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const mw = () => {};

    before(() => {
        connectOrig = amqplib.connect;
        clientOrig = client.Client;
        client.Client = ClientMock as unknown as typeof client.Client;
        parserOrig = parser.ContentParser;
        parser.ContentParser = ParserMock as unknown as typeof parser.ContentParser;
    });

    after(() => {
        amqplib.connect = connectOrig;
        client.Client = clientOrig;
        parser.ContentParser = parserOrig;
    });

    beforeEach(function () {
        connectMock = new ConnectMock();
        amqplib.connect = connectMock.connect.bind(connectMock) as unknown as typeof amqplib.connect;

        cabbit = new Cabbit({});
        clientMock = getClientMock();
        parserMock = getParserMock();
    });

    afterEach(async function () {
        await cabbit.close();
    });

    describe('#queue()', () => {
        it('should create named queue', () => {
            expect(cabbit.queue('test', mw)).instanceOf(Queue);
            expect(clientMock.calls).deep.eq([
                ['declareQueue', 'test', qOpts],
            ]);
        });

        it('should create named queue with custom declare options', () => {
            expect(cabbit.queue('test', mw, {
                declare: {
                    durable: false,
                },
            })).instanceOf(Queue);
            expect(clientMock.calls).deep.eq([
                ['declareQueue', 'test', {
                    declare: {
                        durable: false,
                        autoDelete: false,
                    },
                    consume: {
                        noAck: false,
                        exclusive: false,
                    },
                }],
            ]);
        });

        it('should create named queue with custom consume options', () => {
            expect(cabbit.queue('test', mw, {
                consume: {
                    noAck: true,
                },
            })).instanceOf(Queue);
            expect(clientMock.calls).deep.eq([
                ['declareQueue', 'test', {
                    declare: {
                        durable: true,
                        autoDelete: false,
                    },
                    consume: {
                        noAck: true,
                        exclusive: false,
                    },
                }],
            ]);
        });

        it('should create tmp queue', () => {
            expect(cabbit.queue(mw)).instanceOf(Queue);
            expect(clientMock.calls).deep.eq([
                ['declareTmpQueue', true],
            ]);
        });

        it('should create tmp queue with noAck=false', () => {
            expect(cabbit.queue(mw, false)).instanceOf(Queue);
            expect(clientMock.calls).deep.eq([
                ['declareTmpQueue', false],
            ]);
        });
    });

    function testExchange(exType: 'fanout' | 'direct' | 'topic' | 'headers', exClass: any): void {
        describe(`#${exType}()`, () => {
            it(`should create ${exType} exchange`, () => {
                expect(cabbit[exType]('test')).instanceOf(exClass);
                expect(clientMock.calls).deep.eq([
                    ['declareExchange', 'test', exType, exOpts],
                ]);
            });
        });
    }
    testExchange('fanout', FanoutExchange);
    testExchange('direct', DirectExchange);
    testExchange('topic', TopicExchange);
    testExchange('headers', HeadersExchange);

    describe('#exchange()', () => {
        it('should create custom type exchange', () => {
            expect(cabbit.exchange('test', 'mytype')).instanceOf(CustomExchange);
            expect(clientMock.calls).deep.eq([
                ['declareExchange', 'test', 'mytype', exOpts],
            ]);
        });
    });

    describe('#setDecoder()', () => {
        it('should set decoder for encoding', () => {
            cabbit.setDecoder('test', testDecoder);
            expect(parserMock.calls).deep.eq([
                ['setDecoder', 'test', testDecoder],
            ]);
        });
    });

    describe('#setDefaultDecoder()', () => {
        it('should set default decoder', () => {
            cabbit.setDefaultDecoder(testDecoder);
            expect(parserMock.calls).deep.eq([
                ['setDefaultDecoder', testDecoder],
            ]);
        });
    });

    describe('#setParser()', () => {
        it('should set parser for MIME-type', () => {
            cabbit.setParser('text/test', testParser);
            expect(parserMock.calls).deep.eq([
                ['setParser', 'text/test', testParser],
            ]);
        });
    });

    describe('#setDefaultParser()', () => {
        it('should set default parser', () => {
            cabbit.setDefaultParser(testParser);
            expect(parserMock.calls).deep.eq([
                ['setDefaultParser', testParser],
            ]);
        });
    });

    describe('Events', () => {
        it('should re-emit "error" from connection', async () => {
            const p = promisifyEvent<Error>(cabbit, 'error');
            connectMock.connections[0].emit('error', new Error('test error'));
            const err = await p;
            expect(err.message).eq('test error');
        });

        it('should re-emit "error" from channel', async () => {
            const p = promisifyEvent<Error>(cabbit, 'error');
            connectMock.connections[0].channels[0].emit('error', new Error('test error'));
            const err = await p;
            expect(err.message).eq('test error');
        });

        it('should re-emit "setupFailed" from client', async () => {
            const p = promisifyEvent<Error>(cabbit, 'setupFailed');
            clientMock.emit('setupFailed', new Error('test error'));
            const err = await p;
            expect(err.message).eq('test error');
        });

        it('should re-emit "setup" from client', async () => {
            const p = promisifyEvent(cabbit, 'setup');
            clientMock.emit('setup');
            await p;
        });

        it('should re-emit "close" from client', async () => {
            const p = promisifyEvent(cabbit, 'close');
            clientMock.emit('close');
            await p;
        });
    });
});
