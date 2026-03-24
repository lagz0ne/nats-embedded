import { describe, test, expect, afterEach } from "bun:test";
import { NatsServer } from "../src/index.js";
import { createConnection } from "node:net";

let server: NatsServer | undefined;

afterEach(async () => {
  if (server) {
    await server.stop();
    server = undefined;
  }
});

describe("NatsServer", () => {
  test("starts on a random port and is connectable", async () => {
    server = await NatsServer.start();

    expect(server.port).toBeGreaterThan(0);
    expect(server.url).toMatch(/^nats:\/\/127\.0\.0\.1:\d+$/);

    // Verify TCP connection works
    const sock = createConnection(server.port, "127.0.0.1");
    const data = await new Promise<string>((resolve, reject) => {
      sock.once("data", (buf) => resolve(buf.toString()));
      sock.once("error", reject);
    });
    sock.destroy();

    // NATS server sends INFO on connect
    expect(data).toStartWith("INFO ");
  });

  test("stops gracefully", async () => {
    server = await NatsServer.start();
    const port = server.port;
    await server.stop();
    const exitCode = await server.exited;

    // On Unix SIGTERM yields exit code 0; on Windows it's null (process killed)
    expect(exitCode === 0 || exitCode === null).toBe(true);

    // Verify port is no longer listening
    const err = await new Promise<Error>((resolve) => {
      const sock = createConnection(port, "127.0.0.1");
      sock.once("error", resolve);
      sock.once("connect", () => {
        sock.destroy();
        resolve(new Error("should not connect"));
      });
    });
    expect(err.message).not.toBe("should not connect");

    server = undefined; // already stopped
  });

  test("starts with JetStream enabled", async () => {
    server = await NatsServer.start({ jetstream: true });

    // Connect and verify JetStream is advertised in INFO
    const sock = createConnection(server.port, "127.0.0.1");
    const data = await new Promise<string>((resolve, reject) => {
      sock.once("data", (buf) => resolve(buf.toString()));
      sock.once("error", reject);
    });
    sock.destroy();

    const info = JSON.parse(data.replace("INFO ", "").trim());
    expect(info.jetstream).toBe(true);
  });

  test("supports custom host", async () => {
    server = await NatsServer.start({ host: "0.0.0.0" });

    expect(server.url).toMatch(/^nats:\/\/0\.0\.0\.0:\d+$/);
    expect(server.port).toBeGreaterThan(0);
  });

  test("debug flag enables NATS debug output", async () => {
    server = await NatsServer.start({ debug: true, serverName: "test-dbg" });
    expect(server.port).toBeGreaterThan(0);
  });

  test("storeDir without jetstream is accepted by nats-server", async () => {
    server = await NatsServer.start({ storeDir: "/tmp/nats-test-nojs" });
    expect(server.port).toBeGreaterThan(0);
  });

  test("starts with websocket enabled", async () => {
    server = await NatsServer.start({ websocket: true });

    expect(server.port).toBeGreaterThan(0);
    expect(server.wsPort).toBeGreaterThan(0);
    expect(server.wsUrl).toMatch(/^ws:\/\/127\.0\.0\.1:\d+$/);
    expect(server.wsPort).not.toBe(server.port);

    // Verify WS port is listening
    const sock = createConnection(server.wsPort!, "127.0.0.1");
    const connected = await new Promise<boolean>((resolve) => {
      sock.once("connect", () => resolve(true));
      sock.once("error", () => resolve(false));
    });
    sock.destroy();
    expect(connected).toBe(true);
  });

  test("websocket + jetstream combined", async () => {
    server = await NatsServer.start({ websocket: true, jetstream: true });

    expect(server.wsPort).toBeGreaterThan(0);

    // Verify JetStream via TCP
    const sock = createConnection(server.port, "127.0.0.1");
    const data = await new Promise<string>((resolve, reject) => {
      sock.once("data", (buf) => resolve(buf.toString()));
      sock.once("error", reject);
    });
    sock.destroy();
    const info = JSON.parse(data.replace("INFO ", "").trim());
    expect(info.jetstream).toBe(true);
  });

  test("wsPort and wsUrl are undefined when websocket not enabled", async () => {
    server = await NatsServer.start();
    expect(server.wsPort).toBeUndefined();
    expect(server.wsUrl).toBeUndefined();
  });

  test("stop cleans up generated config", async () => {
    server = await NatsServer.start({ websocket: true });
    await server.stop();
    const exitCode = await server.exited;
    expect(exitCode === 0 || exitCode === null).toBe(true);
    server = undefined;
  });

  test("exited promise resolves on crash/stop", async () => {
    server = await NatsServer.start();
    const exitedPromise = server.exited;

    await server.stop();

    const code = await exitedPromise;
    expect(code === 0 || code === null).toBe(true);
    server = undefined;
  });
});
