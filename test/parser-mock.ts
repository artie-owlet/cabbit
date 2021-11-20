let parserMock: ParserMock | undefined = undefined;
export class ParserMock {
    public calls = [] as [string, ...unknown[]][];

    constructor() {
        parserMock = this;
    }

    public parse(): any {
        return 'test';
    }

    public setDecoder(...args: unknown[]): void {
        this.calls.push(['setDecoder', ...args]);
    }

    public setDefaultDecoder(...args: unknown[]): void {
        this.calls.push(['setDefaultDecoder', ...args]);
    }

    public setParser(...args: unknown[]): void {
        this.calls.push(['setDefaultParser', ...args]);
    }

    public setDefaultParser(...args: unknown[]): void {
        this.calls.push(['setDefaultParser', ...args]);
    }
}

export function getParserMock(): ParserMock | undefined {
    return parserMock;
}

export function clearParserMock(): void {
    parserMock = undefined;
}
