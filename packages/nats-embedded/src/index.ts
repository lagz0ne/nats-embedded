import { spawn, type ChildProcess } from "node:child_process";
import { resolve } from "./resolve.js";
import { parsePort } from "./parse.js";

export interface NatsServerOptions {
  /** Port to listen on. -1 = random (default), 0 = nats default (4222). */
  port?: number;
  /** Host to bind to. Default: 127.0.0.1 */
  host?: string;
  /** Enable JetStream. Default: false */
  jetstream?: boolean;
  /** JetStream storage directory. Requires jetstream: true */
  storeDir?: string;
  /** Forward nats-server logs to stderr. Default: false */
  debug?: boolean;
  /** Path to a custom nats.conf file */
  config?: string;
  /** Extra CLI arguments passed to nats-server */
  args?: string[];
}

export class NatsServer {
  /** Full NATS connection URL (e.g. nats://127.0.0.1:52431) */
  readonly url: string;
  /** Assigned port */
  readonly port: number;
  /** Resolves with the exit code when the process exits (for crash detection) */
  readonly exited: Promise<number | null>;

  private proc: ChildProcess;

  private constructor(proc: ChildProcess, host: string, port: number) {
    this.proc = proc;
    this.port = port;
    this.url = `nats://${host}:${port}`;
    this.exited = new Promise((res) => {
      proc.on("exit", (code) => res(code));
    });
  }

  static async start(opts: NatsServerOptions = {}): Promise<NatsServer> {
    const bin = resolve();
    const host = opts.host ?? "127.0.0.1";
    const port = opts.port ?? -1;

    const args = ["-a", host, "-p", String(port)];
    if (opts.jetstream) {
      args.push("--jetstream");
      if (opts.storeDir) args.push("--store_dir", opts.storeDir);
    }
    if (opts.config) args.push("-c", opts.config);
    if (opts.args) args.push(...opts.args);

    const proc = spawn(bin, args, {
      stdio: ["ignore", "ignore", "pipe"],
    });

    const assignedPort = await new Promise<number>((resolve, reject) => {
      const timeout = setTimeout(() => {
        proc.kill("SIGKILL");
        reject(new Error("nats-server did not start within 5s"));
      }, 5000);

      proc.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      proc.on("exit", (code) => {
        clearTimeout(timeout);
        reject(new Error(`nats-server exited with code ${code} before ready`));
      });

      let buffer = "";
      proc.stderr!.on("data", (chunk: Buffer) => {
        const text = chunk.toString();
        if (opts.debug) process.stderr.write(text);
        buffer += text;
        const lines = buffer.split("\n");
        buffer = lines.pop()!;
        for (const line of lines) {
          const parsed = parsePort(line);
          if (parsed !== null) {
            clearTimeout(timeout);
            // Stop listening for exit as an error once we have the port
            proc.removeAllListeners("exit");
            resolve(parsed);
            return;
          }
        }
      });
    });

    return new NatsServer(proc, host, assignedPort);
  }

  /** Gracefully stop the server (SIGTERM → 5s timeout → SIGKILL) */
  async stop(): Promise<void> {
    if (this.proc.exitCode !== null) return;
    this.proc.kill("SIGTERM");
    const exited = await Promise.race([
      this.exited.then(() => true),
      new Promise<false>((r) => setTimeout(() => r(false), 5000)),
    ]);
    if (!exited) {
      this.proc.kill("SIGKILL");
      await this.exited;
    }
  }
}

export { resolve as resolveBinary } from "./resolve.js";
