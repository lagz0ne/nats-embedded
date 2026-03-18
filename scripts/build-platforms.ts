#!/usr/bin/env bun
/**
 * Downloads nats-server binaries from GitHub releases into platform packages.
 *
 * Usage:
 *   bun run scripts/build-platforms.ts              # latest version
 *   NATS_VERSION=v2.10.24 bun run scripts/build-platforms.ts  # specific version
 */
import { mkdirSync, chmodSync, cpSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const PLATFORMS = [
  { pkg: "linux-x64", archive: "linux-amd64", ext: "tar.gz", bin: "nats-server" },
  { pkg: "linux-arm64", archive: "linux-arm64", ext: "tar.gz", bin: "nats-server" },
  { pkg: "darwin-x64", archive: "darwin-amd64", ext: "tar.gz", bin: "nats-server" },
  { pkg: "darwin-arm64", archive: "darwin-arm64", ext: "tar.gz", bin: "nats-server" },
  { pkg: "win32-x64", archive: "windows-amd64", ext: "zip", bin: "nats-server.exe" },
  { pkg: "win32-arm64", archive: "windows-arm64", ext: "zip", bin: "nats-server.exe" },
] as const;

const NATS_SERVER_VERSION = "v2.12.5";
const ROOT = join(import.meta.dir, "..");

async function download(version: string, archiveKey: string, ext: string): Promise<ArrayBuffer> {
  const url = `https://github.com/nats-io/nats-server/releases/download/${version}/nats-server-${version}-${archiveKey}.${ext}`;
  console.log(`  Downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} for ${url}`);
  return res.arrayBuffer();
}

async function extractBinary(archive: ArrayBuffer, destDir: string, ext: string, bin: string): Promise<void> {
  const tmp = join(tmpdir(), `nats-embedded-${Date.now()}`);
  mkdirSync(tmp, { recursive: true });

  if (ext === "zip") {
    // Write zip to disk, then unzip (no stdin pipe for unzip)
    const zipPath = join(tmp, "archive.zip");
    await Bun.write(zipPath, archive);
    const proc = Bun.spawn(["unzip", "-o", zipPath, "-d", tmp], {
      stdout: "inherit",
      stderr: "inherit",
    });
    if ((await proc.exited) !== 0) throw new Error("unzip extraction failed");
  } else {
    const proc = Bun.spawn(["tar", "xzf", "-", "-C", tmp], {
      stdin: new Response(archive).body!,
      stdout: "inherit",
      stderr: "inherit",
    });
    if ((await proc.exited) !== 0) throw new Error("tar extraction failed");
  }

  // Binary is at <tmp>/nats-server-<version>-<platform>/<bin>
  const entries = new Bun.Glob(`*/${bin}`).scanSync({ cwd: tmp });
  const entry = entries.next().value;
  if (!entry) throw new Error(`${bin} not found in archive`);
  cpSync(join(tmp, entry as string), join(destDir, bin));
  rmSync(tmp, { recursive: true, force: true });
}

async function main() {
  const version = process.env.NATS_VERSION || NATS_SERVER_VERSION;
  console.log(`nats-server version: ${version}\n`);

  const selected = process.argv[2]
    ? PLATFORMS.filter((p) => p.pkg === process.argv[2])
    : PLATFORMS;

  for (const { pkg, archive, ext, bin } of selected) {
    const destDir = join(ROOT, "packages", pkg);
    mkdirSync(destDir, { recursive: true });
    console.log(`[${pkg}]`);
    const data = await download(version, archive, ext);
    await extractBinary(data, destDir, ext, bin);
    chmodSync(join(destDir, bin), 0o755);
    console.log(`  ✓ packages/${pkg}/${bin}\n`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
