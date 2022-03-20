# cabbit
![CI](https://github.com/artie-owlet/cabbit/actions/workflows/ci.yaml/badge.svg)
![Coverage](https://github.com/artie-owlet/cabbit/actions/workflows/coverage.yaml/badge.svg)
![Lint](https://github.com/artie-owlet/cabbit/actions/workflows/lint.yaml/badge.svg)

Package for easy consuming messages from RabbitMQ.

---

## Install

```bash
npm install @artie-owlet/cabbit
```

## Usage

### Get started

You can create cabbit with its own connection:

```ts
import { Cabbit } from '@artie-owlet/cabbit';
// using connection URL
const cabbit1 = new Cabbit('amqp://user:pwd@example.com:5672/');
// using options
const cabbit2 = new Cabbit({
    hostname: 'example.com',
    port: 5672,
    username: 'user',
    password: 'pwd',
    vhost: '/',
})
```

Or you can create your own connection (using the [ConnectionWrapper](https://github.com/artie-owlet/amqplib-wrapper)) and pass it to Cabbit constructor (e.g. you also want to publish messages):

```ts
import { ConnectionWrapper } from '@artie-owlet/amqplib-wrapper';
import { Cabbit } from '@artie-owlet/cabbit';

const connWrap = new ConnectionWrapper('amqp://user:pwd@example.com:5672/?reconnectTimeout=1000');
// cabbit for consuming messages
const cabbit = new Cabbit(connWrap);
// separate channel for publishing messages
const chan = await chanWrap.getChannel();
```

### Consuming from named queue

```mermaid
graph LR
    pub{{Pub}} --> queue[test_queue] --> sub{{Sub}}
```

```ts
cabbit.queue('test_queue', (msg) => {
    if (msg.body === undefined) {
        console.error(msg.parseError);
    } else {
        console.log(msg.body);
    }
    msg.ack();
});
```

**NOTE:** Cabbit trying to decode and parse messages according to their encoding and MIME-type. If an error occurs the `body` will be undefined. Usually you should check it.

### Simple subcribing to exchange

```mermaid
graph LR
    pub{{Pub}} --> ex((test_ex)) -- key --> queue[test_queue] --> sub{{Sub}}
```

In simple cases like this, Cabbit represents the subscription as a consumption from the exchange through the (named) queue:

```ts
cabbit.direct('test_ex').consume('test_queue', (msg) => {
    // handle message
    msg.ack();
}, 'key');
```

### Temporary queue

Temporary queue - is a server-named queue which should be removed after the client disconnects. By default Cabbit consumes from a temporary queue with `noAck=true`.

```mermaid
graph LR
    pub{{Pub}} --> ex((test_ex)) -- key --> queue[amq.gen-...] --> sub{{Sub}}
```

```ts
cabbit.direct('test_ex').consume((msg) => {
    // handle message
    // DON'T call msg.ack()
}, 'key');
```

## API

See https://artie-owlet.github.io/cabbit/
