let parserMock: ParserMock | undefined = undefined;

export class ParserMock {
    public decoderArgs = [] as unknown[];
    public defaultDecoderArgs = [] as unknown[];
    public parserArgs = [] as unknown[];
    public defaultParserArgs = [] as unknown[];

    constructor() {
        parserMock = this;
    }

    public parse(): any {
        return 'test';
    }

    public setDecoder(...args: unknown[]): void {
        this.decoderArgs = [...args];
    }

    public setDefaultDecoder(...args: unknown[]): void {
        this.defaultDecoderArgs = [...args];
    }

    public setParser(...args: unknown[]): void {
        this.parserArgs = [...args];
    }

    public setDefaultParser(...args: unknown[]): void {
        this.defaultParserArgs = [...args];
    }
}
