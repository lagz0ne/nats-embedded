import { resolve as resolvePath } from "node:path";

type ConfigBlock = Record<string, unknown>;

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

function serializeBlock(name: string, obj: ConfigBlock): string {
  const lines = Object.entries(obj).map(([k, v]) => {
    const key = toSnakeCase(k);
    if (typeof v === "string") return `  ${key}: "${v}"`;
    return `  ${key}: ${v}`;
  });
  return `${name} {\n${lines.join("\n")}\n}`;
}

const WS_DEFAULTS: ConfigBlock = { port: -1, no_tls: true };

export function buildConfig(opts: {
  websocket?: boolean | ConfigBlock;
  config?: string;
}): string | null {
  if (!opts.websocket) return null;

  const ws =
    opts.websocket === true
      ? { ...WS_DEFAULTS }
      : { ...WS_DEFAULTS, ...opts.websocket };

  const parts: string[] = [serializeBlock("websocket", ws)];

  if (opts.config) {
    parts.push(`include '${resolvePath(opts.config)}'`);
  }

  return parts.join("\n\n") + "\n";
}
