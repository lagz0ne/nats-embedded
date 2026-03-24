import { describe, test, expect } from "bun:test";
import { buildConfig } from "../src/config.js";
import { resolve } from "node:path";

describe("buildConfig", () => {
  test("returns null when websocket is not set", () => {
    expect(buildConfig({})).toBeNull();
    expect(buildConfig({ websocket: false })).toBeNull();
  });

  test("websocket: true uses embedded defaults", () => {
    const config = buildConfig({ websocket: true })!;
    expect(config).toContain("websocket {");
    expect(config).toContain("port: -1");
    expect(config).toContain("no_tls: true");
  });

  test("websocket object merges with defaults", () => {
    const config = buildConfig({ websocket: { port: 59123 } })!;
    expect(config).toContain("port: 59123");
    expect(config).toContain("no_tls: true");
  });

  test("websocket object can override defaults", () => {
    const config = buildConfig({ websocket: { noTls: false } })!;
    expect(config).toContain("no_tls: false");
  });

  test("camelCase keys are converted to snake_case", () => {
    const config = buildConfig({ websocket: { handshakeTimeout: 5 } })!;
    expect(config).toContain("handshake_timeout: 5");
  });

  test("string values are quoted", () => {
    const config = buildConfig({ websocket: { host: "0.0.0.0" } })!;
    expect(config).toContain('host: "0.0.0.0"');
  });

  test("includes user config file with absolute path", () => {
    const config = buildConfig({
      websocket: true,
      config: "./my-nats.conf",
    })!;
    expect(config).toContain(`include '${resolve("./my-nats.conf")}'`);
  });

  test("websocket block comes before include", () => {
    const config = buildConfig({
      websocket: true,
      config: "./nats.conf",
    })!;
    const wsIdx = config.indexOf("websocket {");
    const includeIdx = config.indexOf("include");
    expect(wsIdx).toBeLessThan(includeIdx);
  });
});
