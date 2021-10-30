import { expect } from 'chai';

import { Channel, ConsumeMessage as AmqplibMessage } from 'amqplib';

import { ContentParser } from '../src/content-parser';
import { Message } from '../src/message';

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

class ChannelMock {
    public ackArgs = [] as any[];
    public nackArgs = [] as any[];

    public ack(msg: AmqplibMessage, allUpTo: boolean): void {
        this.ackArgs = [msg, allUpTo];
    }

    public nack(msg: AmqplibMessage, allUpTo: boolean, requeue: boolean): void {
        this.nackArgs = [msg, allUpTo, requeue];
    }
}

const parser = new ContentParser();
parser.setParser('test/error', () => {
    throw new Error('test error');
});

describe('Message', () => {
    let chanMock: ChannelMock;
    beforeEach(() => {
        chanMock = new ChannelMock();
    });

    describe('constructor', () => {
        it('should parse message', () => {
            const msg = new Message(msgMock, { chan: chanMock as unknown as Channel }, parser);
            expect(msg.body).eq('hello');
            expect(msg.parseError).eq(undefined);
        });

        it('should handle wrong message', () => {
            const wrongMsgMock = Object.assign({}, msgMock);
            wrongMsgMock.properties.contentType = 'test/error';
            const msg = new Message(wrongMsgMock, { chan: chanMock as unknown as Channel }, parser);
            expect(msg.body).eq(undefined);
            expect(msg.parseError).eq('test error');
        });
    });

    describe('#ack()', () => {
        it('should ack single message', () => {
            const msg = new Message(msgMock, { chan: chanMock as unknown as Channel }, parser);
            expect(msg.ack()).eq(true);
            expect(chanMock.ackArgs).deep.eq([msgMock, false]);
        });

        it('should ack all messages', () => {
            const msg = new Message(msgMock, { chan: chanMock as unknown as Channel }, parser);
            expect(msg.ack(true)).eq(true);
            expect(chanMock.ackArgs).deep.eq([msgMock, true]);
        });

        it('should return false if channel closed', () => {
            const msg = new Message(msgMock, { chan: null }, parser);
            expect(msg.ack()).eq(false);
        });
    });

    describe('#nack()', () => {
        it('should nack single message', () => {
            const msg = new Message(msgMock, { chan: chanMock as unknown as Channel }, parser);
            expect(msg.nack()).eq(true);
            expect(chanMock.nackArgs).deep.eq([msgMock, false, false]);
        });

        it('should nack message with requeue', () => {
            const msg = new Message(msgMock, { chan: chanMock as unknown as Channel }, parser);
            expect(msg.nack(false, true)).eq(true);
            expect(chanMock.nackArgs).deep.eq([msgMock, false, true]);
        });

        it('should nack all messages', () => {
            const msg = new Message(msgMock, { chan: chanMock as unknown as Channel }, parser);
            expect(msg.nack(true)).eq(true);
            expect(chanMock.nackArgs).deep.eq([msgMock, true, false]);
        });

        it('should return false if channel closed', () => {
            const msg = new Message(msgMock, { chan: null }, parser);
            expect(msg.nack()).eq(false);
        });
    });
});
