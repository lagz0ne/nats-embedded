import { platform, arch } from "node:os";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PLATFORM_MAP: Record<string, string> = {
  "linux-x64": "@nats-embedded/linux-x64",
  "linux-arm64": "@nats-embedded/linux-arm64",
  "darwin-x64": "@nats-embedded/darwin-x64",
  "darwin-arm64": "@nats-embedded/darwin-arm64",
  "win32-x64": "@nats-embedded/win32-x64",
  "win32-arm64": "@nats-embedded/win32-arm64",
};

const BINARY_NAME = platform() === "win32" ? "nats-server.exe" : "nats-server";

export function resolve(): string {
  if (process.env.NATS_EMBEDDED_BINARY) return process.env.NATS_EMBEDDED_BINARY;

  const key = `${platform()}-${arch()}`;
  const pkg = PLATFORM_MAP[key];
  if (!pkg) throw new Error(`Unsupported platform: ${key}. Supported: ${Object.keys(PLATFORM_MAP).join(", ")}`);

  // Try require.resolve first (works when platform packages are installed via npm)
  try {
    const require_ = createRequire(import.meta.url);
    return require_.resolve(`${pkg}/${BINARY_NAME}`);
  } catch {
    // Fallback: sibling package in monorepo layout
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const sibling = join(__dirname, "..", "..", key, BINARY_NAME);
    if (existsSync(sibling)) return sibling;
    throw new Error(`Cannot find nats-server binary. Install ${pkg} or set NATS_EMBEDDED_BINARY`);
  }
}
