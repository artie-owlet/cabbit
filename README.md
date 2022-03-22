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
// another channel for publishing messages
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

**NOTE:** Cabbit trying to decode and parse messages according to their encoding and MIME-type. If an error occurs the `body` will be `undefined`. Usually you should check it.

### Simple subcribing to exchange

```mermaid
graph LR
    pub{{Pub}} --> ex((D test_ex)) -- key --> queue[test_queue] --> sub{{Sub}}
```

In such simple cases, Cabbit represents the subscription as a consumption from the exchange through the (named) queue:

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
    pub{{Pub}} --> ex((D test_ex)) -- key --> queue[amq.gen-...] --> sub{{Sub}}
```

```ts
cabbit.direct('test_ex').consume((msg) => {
    // handle message
    // DON'T call msg.ack()
}, 'key');
```

### Complex example

```mermaid
graph LR
    pub{{Pub}}
    sub{{Sub}}
    ex1((D log_ex))
    ex2((H error_ex))
    queue1[all_logs_q]
    queue2[test_err_q]
    pub --> ex1
    ex1 -- info --> queue1
    ex1 -- warn --> queue1
    ex1 -- error --> queue1
    queue1 --> sub
    ex1 -- error --> ex2 -->queue2 -->sub
```

```ts
const logEx = cabbit.direct('log_ex');

logEx.consume('all_logs_q', (msg) => {
    switch (msg.fields.routingKey) {
        // handle message according to its routing key
    }
    msg.ack();
}, ['info', 'warn', 'error']); // you can pass a list of routing keys

logEx.headers('error_ex').consume('test_err_q', (msg) => {
    // handle message
    msg.ack();
}, {
    'x-match': 'all',
    app: 'test',
});
```

### Subscribing to multiple exchanges

```mermaid
graph LR
    pub1{{Pub 1}} --> ex1((D ex1)) -- key --> queue[test_queue] --> sub{{Sub}}
    pub2{{Pub 2}} --> ex2((F ex2)) --> queue
```

```ts
cabbit.queue('test_queue', (msg) => {
    // handle message
    msg.ack();
}).subscribe(cabbit.direct('ex1', 'key')).subscribe(cabbit.fanout('ex2'));
```

## API

See https://artie-owlet.github.io/cabbit/
