import { gzipSync, gunzipSync } from 'zlib';

import { expect } from 'chai';
import * as qs from 'qs';

import { ContentParser } from '../src/content-parser';

function parseQs(input: Buffer) {
    return qs.parse(input.toString());
}

describe('ContentParser', () => {
    describe('#parse()', () => {
        const cp = new ContentParser();

        type BufferEncoding = 'ascii' | 'utf8' | 'utf16le' | 'latin1';
        const testTextParser = (charset: string, text: string, jsEnc: BufferEncoding) => {
            it(`should parse "text/plain; charset=${charset}"`, () => {
                expect(cp.parse(Buffer.from(text, jsEnc), undefined, `text/plain; charset=${charset}`)).eq(text);
            });
        };
        ([
            ['UTF-8', 'кролик', 'utf8'],
            ['UTF-16LE', 'кролик', 'utf16le'],
            ['US-ASCII', 'rabbit', 'ascii'],
            ['ISO-8859-1', 'lièvre', 'latin1'],
        ] as [string, string, BufferEncoding][])
            .forEach(([charset, text, jsEnc]) => testTextParser(charset, text, jsEnc));

        it('should parse "text/plain"', () => {
            expect(cp.parse(Buffer.from('кролик'), undefined, 'text/plain')).eq('кролик');
        });

        it('should parse "application/json"', () => {
            const data = {a: 123};
            expect(cp.parse(Buffer.from(JSON.stringify(data)), undefined, 'application/json')).deep.eq(data);
        });

        it('should return input data if encoding and MIME-type both undefined', () => {
            const data = Buffer.from('rabbit');
            expect(cp.parse(data, undefined, undefined)).eq(data);
        });

        it('should throw for unknown encoding', () => {
            const data = 'The quick brown fox jumps over the lazy dog';
            expect(cp.parse.bind(cp, gzipSync(Buffer.from(data)), 'gzip', 'text/plain')).throw();
        });

        it('should throw for unknown MIME-type', () => {
            const data = {a: 'abc'};
            expect(cp.parse.bind(cp, Buffer.from(qs.stringify(data)), undefined, 'application/x-www-form-urlencoded'))
                .throw();
        });

        it('should throw for unknown charset', () => {
            expect(cp.parse.bind(cp, Buffer.from([0xAA, 0xE0, 0xAE, 0xAB, 0xA8, 0xAA]), undefined,
                'text/plain; charset=IBM866')).throw();
        });
    });

    describe('#setDecoder()', () => {
        const cp = new ContentParser();

        it('should set decoder', () => {
            cp.setDecoder('gzip', gunzipSync);
            const data = 'The quick brown fox jumps over the lazy dog';
            expect(cp.parse(gzipSync(Buffer.from(data)), 'gzip', 'text/plain')).eq(data);
        });
    });

    describe('#setDefaultDecoder()', () => {
        const cp = new ContentParser();

        it('should set default decoder', () => {
            cp.setDefaultDecoder(gunzipSync);
            const data = 'The quick brown fox jumps over the lazy dog';
            expect(cp.parse(gzipSync(Buffer.from(data)), undefined, 'text/plain')).eq(data);
        });
    });

    describe('#setParser()', () => {
        const cp = new ContentParser();

        it('should set MIME-type parser', () => {
            cp.setParser('application/x-www-form-urlencoded', parseQs);
            const data = {a: 'abc'};
            expect(cp.parse(Buffer.from(qs.stringify(data)), undefined, 'application/x-www-form-urlencoded'))
                .deep.eq(data);
        });
    });

    describe('#setDefaultParser()', () => {
        const cp = new ContentParser();

        it('should set default MIME-type parser', () => {
            cp.setDefaultParser(parseQs);
            const data = {a: 'abc'};
            expect(cp.parse(Buffer.from(qs.stringify(data)), undefined, undefined)).deep.eq(data);
        });
    });
});
