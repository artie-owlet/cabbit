import { Channel, Message as AmqpMessage } from 'amqplib';

export class ChannelHandler {
    private chan: Channel | null = null;

    constructor(
        chan: Channel,
    ) {
        this.chan = chan;
        chan.once('close', () => {this.chan = null;});
    }

    public ack(msg: AmqpMessage, allUpTo: boolean): boolean {
        if(this.chan) {
            this.chan.ack(msg, allUpTo);
            return true;
        }
        return false;
    }

    public nack(msg: AmqpMessage, allUpTo: boolean, requeue: boolean): boolean {
        if(this.chan) {
            this.chan.nack(msg, allUpTo, requeue);
            return true;
        }
        return false;
    }
}
