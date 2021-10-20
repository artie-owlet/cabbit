export type ContentDecoder = (input: Buffer) => Buffer;
export type ContentMimeTypeParser = (input: Buffer, charset?: string) => any;

export function charsetParser(input: Buffer, charset?: string): string {
    if (!charset) {
        return input.toString('utf8');
    }
    switch (charset.toLowerCase()) {
        case 'utf-8':
            return input.toString('utf8');
        case 'utf-16le':
            return input.toString('utf16le');
        case 'us-ascii':
            return input.toString('ascii');
        case 'iso-8859-1':
            return input.toString('latin1');
    }
    throw new Error(`unknown charset ${charset}`);
}

function plainTextParser(input: Buffer, charset?: string): string {
    return charsetParser(input, charset);
}

function jsonParser(input: Buffer): any {
    return JSON.parse(input.toString('utf8'));
}

export class ContentParser {
    private decoders = new Map<string, ContentDecoder>();
    private decodeDefault: ContentDecoder | null = null;
    private parsers = new Map<string, ContentMimeTypeParser>([
        ['text/plain', plainTextParser],
        ['application/json', jsonParser],
    ]);
    private parseDefault: ContentMimeTypeParser | null = null;

    public parse(input: Buffer, contentEncoding: string | undefined, contentType: string | undefined): any {
        if (contentEncoding && contentEncoding !== '') {
            contentEncoding.replace(/\s/g, '').split(',').forEach((enc) => {
                const decode = this.decoders.get(enc.toLowerCase());
                if (!decode) {
                    throw new Error(`unknown encoding ${enc}`);
                }
                input = decode(input);
            });
        } else if (this.decodeDefault) {
            input = this.decodeDefault(input);
        }

        if (contentType && contentType !== '') {
            const [mimeType, charset] = contentType.replace(/\s/g, '').split(';charset=');
            const parseMimeType = this.parsers.get(mimeType.toLowerCase());
            if (!parseMimeType) {
                throw new Error(`unknown mime type ${mimeType}`);
            }
            return parseMimeType(input, charset);
        } else if (this.parseDefault) {
            return this.parseDefault(input);
        }
        return input;
    }

    public setDecoder(encoding: string, decode: ContentDecoder): void {
        this.decoders.set(encoding.toLowerCase(), decode);
    }

    public setDefaultDecoder(decode: ContentDecoder): void {
        this.decodeDefault = decode;
    }

    public setParser(mimeType: string, parse: ContentMimeTypeParser): void {
        this.parsers.set(mimeType.toLowerCase(), parse);
    }

    public setDefaultParser(parse: ContentMimeTypeParser): void {
        this.parseDefault = parse;
    }
}

export type ParseContent = typeof ContentParser.prototype.parse;
