/* eslint-disable prefer-rest-params */
import { CallRecorder, mixCallRecorder } from './call-recorder';

// eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-empty-interface
export interface ParserMock extends CallRecorder {}

let parserMock: ParserMock | undefined = undefined;
export class ParserMock {
    public calls = [] as [string, ...unknown[]][];

    constructor() {
        parserMock = this;
    }

    public parse(): any {
        return 'test';
    }

    public setDecoder(): void {
        this.recordCall(arguments);
    }

    public setDefaultDecoder(): void {
        this.recordCall(arguments);
    }

    public setParser(): void {
        this.recordCall(arguments);
    }

    public setDefaultParser(): void {
        this.recordCall(arguments);
    }
}
mixCallRecorder(ParserMock);

export function getParserMock(): ParserMock | undefined {
    return parserMock;
}

export function clearParserMock(): void {
    parserMock = undefined;
}
