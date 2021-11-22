interface IArguments {
    [index: number]: unknown;
}

export class CallRecorder {
    private _calls?: [string, ...unknown[]][];

    get calls(): [string, ...unknown[]][] {
        if (!this._calls) {
            this._calls = [];
        }
        return this._calls;
    }

    set calls(calls: [string, ...unknown[]][]) {
        this._calls = calls;
    }

    public recordCall(args: IArguments, exclude = [] as number[]): void {
        const err = {} as Error;
        // eslint-disable-next-line @typescript-eslint/unbound-method
        Error.captureStackTrace(err, CallRecorder.prototype.recordCall);
        const pst = Error.prepareStackTrace;
        Error.prepareStackTrace = (_, sst) => {
            return sst;
        };
        const stack = ((err.stack as unknown) as NodeJS.CallSite[]);
        Error.prepareStackTrace = pst;

        const rec = [stack[0].getFunctionName() || ''] as [string, ...unknown[]];
        for (const key in args) {
            const id = Number(key);
            if (!exclude.includes(id)) {
                rec.push(args[id]);
            }
        }
        this.calls.push(rec);
    }
}

type Ctor = new (...args: any[]) => any;

export function installCallRecorder(target: Ctor): void {
    Object.getOwnPropertyNames(CallRecorder.prototype).filter(name => name !== 'constructor')
        .forEach((name) => {
            Object.defineProperty(target.prototype, name,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                Object.getOwnPropertyDescriptor(CallRecorder.prototype, name) || Object.create(null));
        });
}
