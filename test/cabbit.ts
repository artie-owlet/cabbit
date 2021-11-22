import { expect } from 'chai';

/* eslint-disable @typescript-eslint/no-var-requires */
const amqplib = require('amqplib') as typeof import('amqplib');
const client = require('../src/client') as typeof import('../src/client');
const parser = require('../src/content-parser') as typeof import('../src/content-parser');
/* eslint-enable @typescript-eslint/no-var-requires */

import { ConnectionWrapper, ChannelWrapper } from '@artie-owlet/amqplib-wrapper';
import { Channel } from 'amqplib';

import { ConnectMock } from './amqplib-mock';
import { ClientMock, getClientMock, clearClientMock } from './client-mock';
import { ParserMock, getParserMock, clearParserMock } from './parser-mock';
import { promisifyEvent } from './promisify-event';

import { Cabbit } from '../src/index';

describe('Cabbit', () => {
    let connectOrig: typeof amqplib.connect;
    let clientOrig: typeof client.Client;
    let parserOrig: typeof parser.ContentParser;
    let connectMock: ConnectMock;
    let cabbit: Cabbit;

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
