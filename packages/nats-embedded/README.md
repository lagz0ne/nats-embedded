# nats-embedded

Embedded [NATS](https://nats.io) server for Node.js and Bun. Bundles the official `nats-server` binary as a managed child process with automatic random port allocation — zero conflicts, zero configuration.

Works with both ESM and CommonJS.

## Install

```bash
npm install @lagz0ne/nats-embedded
```

The correct platform binary (`linux-x64`, `linux-arm64`, `darwin-x64`, `darwin-arm64`, `win32-x64`, `win32-arm64`) is installed automatically via `optionalDependencies`.

## Usage

```typescript
import { NatsServer } from '@lagz0ne/nats-embedded';

const server = await NatsServer.start();
console.log(server.url); // nats://127.0.0.1:52431

// ... use server.url to connect your NATS client ...

await server.stop();
```

CommonJS:

```javascript
const { NatsServer } = require('@lagz0ne/nats-embedded');
```

## Options

All nats-server CLI flags are exposed as typed options. No guards — NATS validates.

```typescript
const server = await NatsServer.start({
  // Server
  port: -1,                // -1 = random (default), 0 = nats default (4222)
  host: '127.0.0.1',      // default: localhost only
  serverName: 'my-server', // default: auto-generated

  // JetStream
  jetstream: true,
  storeDir: '/tmp/js',

  // WebSocket
  websocket: true,         // random port, no TLS (embedded defaults)
  // or: websocket: { port: 8080, noTls: false }

  // Auth
  user: 'admin',
  pass: 'secret',
  token: 'auth-token',

  // TLS
  tls: true,
  tlsCert: '/path/to/cert.pem',
  tlsKey: '/path/to/key.pem',

  // Logging
  debug: true,             // NATS -D flag
  trace: true,             // NATS -V flag
  verbose: true,           // forward nats-server stderr to process.stderr

  // Monitoring
  httpPort: 8222,

  // Escape hatches
  config: './nats.conf',   // custom config file
  args: [],                // extra CLI arguments
});
```

## WebSocket

```typescript
const server = await NatsServer.start({ websocket: true });

console.log(server.wsUrl);  // ws://127.0.0.1:54322
console.log(server.wsPort); // 54322

// Full control over websocket config block
const server = await NatsServer.start({
  websocket: { port: 8080, noTls: false },
});

// Combined with custom config file (your file takes precedence)
const server = await NatsServer.start({
  websocket: true,
  config: './my-nats.conf',
});
```

## API

### `NatsServer.start(opts?): Promise<NatsServer>`

Starts a new nats-server process. Resolves when all listeners are ready.

### `server.url: string`

NATS connection URL (e.g. `nats://127.0.0.1:52431`).

### `server.port: number`

Assigned TCP port number.

### `server.wsUrl?: string`

WebSocket URL (e.g. `ws://127.0.0.1:54322`). Undefined if websocket not enabled.

### `server.wsPort?: number`

WebSocket port. Undefined if websocket not enabled.

### `server.stop(): Promise<void>`

Gracefully stops the server (SIGTERM, then SIGKILL after 5s).

### `server.exited: Promise<number | null>`

Resolves with the exit code when the process exits. Useful for crash detection.

## Custom binary

Set `NATS_EMBEDDED_BINARY` to override the bundled binary path:

```bash
NATS_EMBEDDED_BINARY=/usr/local/bin/nats-server node app.js
```

## License

Apache-2.0
