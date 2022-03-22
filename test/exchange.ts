import { expect } from 'chai';

/* eslint-disable @typescript-eslint/no-var-requires */
const amqplib = require('amqplib') as typeof import('amqplib');
const client = require('../src/client') as typeof import('../src/client');
/* eslint-enable @typescript-eslint/no-var-requires */

import { ConnectMock } from './amqplib-mock';
import { ClientMock, getClientMock } from './client-mock';

import {
    Cabbit,
    FanoutExchange,
    DirectExchange,
    TopicExchange,
    HeadersExchange,
    CustomExchange,
    IRoutingHeaders
} from '../src/index';

const exOpts = {
    internal: true,
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

const routingHeaders: IRoutingHeaders = {
    'x-match': 'all',
    app: 'testapp',
};

const routingArgs = {
    id: 123,
};

describe('Exchange', () => {
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

    describe('fanout', () => {
        let ex: FanoutExchange;

        beforeEach(() => {
            ex = cabbit.fanout('test');
            clientMock.calls = [];
        });

        describe('#consume()', () => {
            it('should create and bind named queue', () => {
                ex.consume('testq', mw);
                expect(clientMock.calls).deep.eq([
                    ['declareQueue', 'testq', qOpts],
                    ['bindQueue', 'test', 'testq', '', undefined],
                ]);
            });

            it('should create and bind tmp queue', () => {
                ex.consume(mw);
                expect(clientMock.calls).deep.eq([
                    ['declareTmpQueue', true],
                    ['bindQueue', 'test', 1, '', undefined],
                ]);
            });
        });

        function testExchange(exType: 'fanout' | 'direct' | 'topic' | 'headers', exClass: any): void {
            describe(`#${exType}()`, () => {
                it(`should create and bind internal ${exType} exchange`, () => {
                    expect(ex[exType]('testex')).instanceOf(exClass);
                    expect(clientMock.calls).deep.eq([
                        ['declareExchange', 'testex', exType, exOpts],
                        ['bindExchange', 'test', 'testex', '', undefined],
                    ]);
                });
            });
        }
        testExchange('fanout', FanoutExchange);
        testExchange('direct', DirectExchange);
        testExchange('topic', TopicExchange);
        testExchange('headers', HeadersExchange);

        describe('#exchange()', () => {
            it('should create and bind internal custom type exchange', () => {
                expect(ex.exchange('testex', 'mytype')).instanceOf(CustomExchange);
                expect(clientMock.calls).deep.eq([
                    ['declareExchange', 'testex', 'mytype', exOpts],
                    ['bindExchange', 'test', 'testex', '', undefined],
                ]);
            });
        });
    });

    describe('direct & topic', () => {
        let ex: DirectExchange;

        beforeEach(() => {
            ex = cabbit.direct('test');
            clientMock.calls = [];
        });

        describe('#consume()', () => {
            it('should create and bind named queue', () => {
                ex.consume('testq', mw, 'testrk');
                expect(clientMock.calls).deep.eq([
                    ['declareQueue', 'testq', qOpts],
                    ['bindQueue', 'test', 'testq', 'testrk', undefined],
                ]);
            });

            it('should create and bind tmp queue', () => {
                ex.consume(mw, 'testrk');
                expect(clientMock.calls).deep.eq([
                    ['declareTmpQueue', true],
                    ['bindQueue', 'test', 1, 'testrk', undefined],
                ]);
            });

            it('should accept multiple routing keys', () => {
                ex.consume(mw, ['testrk1', 'testrk2']);
                expect(clientMock.calls).deep.eq([
                    ['declareTmpQueue', true],
                    ['bindQueue', 'test', 1, 'testrk1', undefined],
                    ['bindQueue', 'test', 1, 'testrk2', undefined],
                ]);
            });
        });

        function testExchange(exType: 'fanout' | 'direct' | 'topic' | 'headers', exClass: any): void {
            describe(`#${exType}()`, () => {
                it(`should create and bind internal ${exType} exchange`, () => {
                    expect(ex[exType]('testex', 'testrk')).instanceOf(exClass);
                    expect(clientMock.calls).deep.eq([
                        ['declareExchange', 'testex', exType, exOpts],
                        ['bindExchange', 'test', 'testex', 'testrk', undefined],
                    ]);
                });
            });
        }
        testExchange('fanout', FanoutExchange);
        testExchange('direct', DirectExchange);
        testExchange('topic', TopicExchange);
        testExchange('headers', HeadersExchange);

        describe('#exchange()', () => {
            it('should create and bind internal custom type exchange', () => {
                expect(ex.exchange('testex', 'mytype', 'testrk')).instanceOf(CustomExchange);
                expect(clientMock.calls).deep.eq([
                    ['declareExchange', 'testex', 'mytype', exOpts],
                    ['bindExchange', 'test', 'testex', 'testrk', undefined],
                ]);
            });
        });
    });

    describe('headers', () => {
        let ex: HeadersExchange;

        beforeEach(() => {
            ex = cabbit.headers('test');
            clientMock.calls = [];
        });

        describe('#consume()', () => {
            it('should create and bind named queue', () => {
                ex.consume('testq', mw, routingHeaders);
                expect(clientMock.calls).deep.eq([
                    ['declareQueue', 'testq', qOpts],
                    ['bindQueue', 'test', 'testq', '', routingHeaders],
                ]);
            });

            it('should create and bind tmp queue', () => {
                ex.consume(mw, routingHeaders);
                expect(clientMock.calls).deep.eq([
                    ['declareTmpQueue', true],
                    ['bindQueue', 'test', 1, '', routingHeaders],
                ]);
            });
        });

        function testExchange(exType: 'fanout' | 'direct' | 'topic' | 'headers', exClass: any): void {
            describe(`#${exType}()`, () => {
                it(`should create and bind internal ${exType} exchange`, () => {
                    expect(ex[exType]('testex', routingHeaders)).instanceOf(exClass);
                    expect(clientMock.calls).deep.eq([
                        ['declareExchange', 'testex', exType, exOpts],
                        ['bindExchange', 'test', 'testex', '', routingHeaders],
                    ]);
                });
            });
        }
        testExchange('fanout', FanoutExchange);
        testExchange('direct', DirectExchange);
        testExchange('topic', TopicExchange);
        testExchange('headers', HeadersExchange);

        describe('#exchange()', () => {
            it('should create and bind internal custom type exchange', () => {
                expect(ex.exchange('testex', 'mytype', routingHeaders)).instanceOf(CustomExchange);
                expect(clientMock.calls).deep.eq([
                    ['declareExchange', 'testex', 'mytype', exOpts],
                    ['bindExchange', 'test', 'testex', '', routingHeaders],
                ]);
            });
        });
    });

    describe('custom', () => {
        let ex: CustomExchange;

        beforeEach(() => {
            ex = cabbit.exchange('test', 'testtype');
            clientMock.calls = [];
        });

        describe('#consume()', () => {
            it('should create and bind named queue', () => {
                ex.consume('testq', mw, 'testrk', routingArgs);
                expect(clientMock.calls).deep.eq([
                    ['declareQueue', 'testq', qOpts],
                    ['bindQueue', 'test', 'testq', 'testrk', routingArgs],
                ]);
            });

            it('should create and bind tmp queue', () => {
                ex.consume(mw, 'testrk', routingArgs);
                expect(clientMock.calls).deep.eq([
                    ['declareTmpQueue', true],
                    ['bindQueue', 'test', 1, 'testrk', routingArgs],
                ]);
            });

            it('should work without routing args', () => {
                ex.consume(mw);
                expect(clientMock.calls).deep.eq([
                    ['declareTmpQueue', true],
                    ['bindQueue', 'test', 1, '', undefined],
                ]);
            });
        });

        function testExchange(exType: 'fanout' | 'direct' | 'topic' | 'headers', exClass: any): void {
            describe(`#${exType}()`, () => {
                it(`should create and bind internal ${exType} exchange`, () => {
                    expect(ex[exType]('testex', 'testrk', routingArgs)).instanceOf(exClass);
                    expect(clientMock.calls).deep.eq([
                        ['declareExchange', 'testex', exType, exOpts],
                        ['bindExchange', 'test', 'testex', 'testrk', routingArgs],
                    ]);
                });
            });
        }
        testExchange('fanout', FanoutExchange);
        testExchange('direct', DirectExchange);
        testExchange('topic', TopicExchange);
        testExchange('headers', HeadersExchange);

        describe('#exchange()', () => {
            it('should create and bind internal custom type exchange', () => {
                expect(ex.exchange('testex', 'mytype', 'testrk', routingArgs)).instanceOf(CustomExchange);
                expect(clientMock.calls).deep.eq([
                    ['declareExchange', 'testex', 'mytype', exOpts],
                    ['bindExchange', 'test', 'testex', 'testrk', routingArgs],
                ]);
            });
        });
    });
});
