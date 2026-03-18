# nats-embedded

Embedded [NATS](https://nats.io) server for Node.js and Bun. Bundles the official `nats-server` binary as a managed child process with automatic random port allocation — zero conflicts, zero configuration.

## Install

```bash
npm install nats-embedded
```

The correct platform binary (`linux-x64`, `linux-arm64`, `darwin-x64`, `darwin-arm64`, `win32-x64`, `win32-arm64`) is installed automatically via `optionalDependencies`.

## Usage

```typescript
import { NatsServer } from 'nats-embedded';

const server = await NatsServer.start();
console.log(server.url); // nats://127.0.0.1:52431

// ... use server.url to connect your NATS client ...

await server.stop();
```

## Options

```typescript
const server = await NatsServer.start({
  port: -1,              // -1 = random (default), 0 = nats default (4222)
  host: '127.0.0.1',    // default: localhost only
  jetstream: true,       // enable JetStream (default: false)
  storeDir: '/tmp/js',   // JetStream storage directory
  debug: false,          // forward nats-server logs to stderr
  config: './nats.conf', // custom config file
  args: [],              // extra CLI arguments
});
```

## API

### `NatsServer.start(opts?): Promise<NatsServer>`

Starts a new nats-server process. Resolves when the server is listening.

### `server.url: string`

NATS connection URL (e.g. `nats://127.0.0.1:52431`).

### `server.port: number`

Assigned port number.

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
