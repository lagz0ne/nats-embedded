import { describe, test, expect } from "bun:test";
import { buildArgs } from "../src/index.js";

describe("buildArgs", () => {
  test("defaults to 127.0.0.1 and random port", () => {
    const args = buildArgs({});
    expect(args).toEqual(["-a", "127.0.0.1", "-p", "-1"]);
  });

  test("boolean flags push flag only when true", () => {
    const args = buildArgs({ jetstream: true, debug: true, tls: true });
    expect(args).toContain("-js");
    expect(args).toContain("-D");
    expect(args).toContain("--tls");
  });

  test("boolean flags are omitted when false", () => {
    const args = buildArgs({ jetstream: false, debug: false });
    expect(args).not.toContain("-js");
    expect(args).not.toContain("-D");
  });

  test("string options push flag + value", () => {
    const args = buildArgs({ storeDir: "/tmp/js", user: "admin", pass: "secret" });
    expect(args).toContain("-sd");
    expect(args[args.indexOf("-sd") + 1]).toBe("/tmp/js");
    expect(args).toContain("--user");
    expect(args[args.indexOf("--user") + 1]).toBe("admin");
    expect(args).toContain("--pass");
    expect(args[args.indexOf("--pass") + 1]).toBe("secret");
  });

  test("number options push flag + stringified value", () => {
    const args = buildArgs({ httpPort: 8222, profile: 6060 });
    expect(args).toContain("-m");
    expect(args[args.indexOf("-m") + 1]).toBe("8222");
    expect(args).toContain("--profile");
    expect(args[args.indexOf("--profile") + 1]).toBe("6060");
  });

  test("array options push flag + comma-joined value", () => {
    const args = buildArgs({ routes: ["nats://a:4222", "nats://b:4222"] });
    expect(args).toContain("--routes");
    expect(args[args.indexOf("--routes") + 1]).toBe("nats://a:4222,nats://b:4222");
  });

  test("storeDir passes through without requiring jetstream", () => {
    const args = buildArgs({ storeDir: "/tmp/store" });
    expect(args).toContain("-sd");
    expect(args).not.toContain("-js");
  });

  test("token maps to --auth flag", () => {
    const args = buildArgs({ token: "s3cret" });
    expect(args).toContain("--auth");
    expect(args[args.indexOf("--auth") + 1]).toBe("s3cret");
  });

  test("config passes through as -c", () => {
    const args = buildArgs({ config: "/etc/nats.conf" });
    expect(args).toContain("-c");
    expect(args[args.indexOf("-c") + 1]).toBe("/etc/nats.conf");
  });

  test("extra args are appended last", () => {
    const args = buildArgs({ jetstream: true, args: ["--custom", "val"] });
    const lastTwo = args.slice(-2);
    expect(lastTwo).toEqual(["--custom", "val"]);
  });

  test("verbose is not passed to nats-server", () => {
    const args = buildArgs({ verbose: true });
    expect(args).toEqual(["-a", "127.0.0.1", "-p", "-1"]);
  });

  test("all TLS flags map correctly", () => {
    const args = buildArgs({
      tls: true,
      tlsCert: "/cert.pem",
      tlsKey: "/key.pem",
      tlsVerify: true,
      tlsCaCert: "/ca.pem",
    });
    expect(args).toContain("--tls");
    expect(args).toContain("--tlscert");
    expect(args[args.indexOf("--tlscert") + 1]).toBe("/cert.pem");
    expect(args).toContain("--tlskey");
    expect(args[args.indexOf("--tlskey") + 1]).toBe("/key.pem");
    expect(args).toContain("--tlsverify");
    expect(args).toContain("--tlscacert");
    expect(args[args.indexOf("--tlscacert") + 1]).toBe("/ca.pem");
  });

  test("cluster options map correctly", () => {
    const args = buildArgs({
      cluster: "nats://0.0.0.0:6222",
      clusterName: "test-cluster",
      noAdvertise: true,
      connectRetries: 5,
    });
    expect(args).toContain("--cluster");
    expect(args[args.indexOf("--cluster") + 1]).toBe("nats://0.0.0.0:6222");
    expect(args).toContain("--cluster_name");
    expect(args[args.indexOf("--cluster_name") + 1]).toBe("test-cluster");
    expect(args).toContain("--no_advertise");
    expect(args).toContain("--connect_retries");
    expect(args[args.indexOf("--connect_retries") + 1]).toBe("5");
  });

  test("custom host and port override defaults", () => {
    const args = buildArgs({ host: "0.0.0.0", port: 4222 });
    expect(args[0]).toBe("-a");
    expect(args[1]).toBe("0.0.0.0");
    expect(args[2]).toBe("-p");
    expect(args[3]).toBe("4222");
  });
});
