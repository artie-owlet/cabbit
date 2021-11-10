import { expect } from 'chai';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const amqplib = require('amqplib') as typeof import('amqplib');
import { ConnectionWrapper, ChannelWrapper } from '@artie-owlet/amqplib-wrapper';
import { Channel } from 'amqplib';

import { ConnectMock } from './amqplib-mock';
import { promisifyEvent } from './promisify-event';

import { Cabbit } from '../src/index';

describe('Cabbit', () => {
    let connectOrig: typeof amqplib.connect;
    let connectMock: ConnectMock;
    let cabbit: Cabbit;

    before(() => {
        connectOrig = amqplib.connect;
    });

    after(() => {
        amqplib.connect = connectOrig;
    });

    beforeEach(function () {
        connectMock = new ConnectMock();
        amqplib.connect = connectMock.connect.bind(connectMock) as unknown as typeof amqplib.connect;

        if (this.currentTest && this.currentTest.titlePath()[1] !== 'constructor') {
            cabbit = new Cabbit({});
        }
    });

    afterEach(async function () {
        if (this.currentTest && this.currentTest.titlePath()[1] !== 'constructor') {
            await cabbit.close();
        }
    });
});
