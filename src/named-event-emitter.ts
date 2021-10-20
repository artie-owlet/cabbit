export interface INEE<E, L> {
    on(event: E, listener: L): this;
    once(event: E, listener: L): this;
    addListener(event: E, listener: L): this;
    prependListener(event: E, listener: L): this;
    prependOnceListener(event: E, listener: L): this;
}
