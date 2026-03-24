import { describe, test, expect } from "bun:test";
import { parsePort, parseWsPort } from "../src/parse.js";

describe("parsePort", () => {
  test("extracts port from TCP listen line", () => {
    expect(
      parsePort("Listening for client connections on 127.0.0.1:4222")
    ).toBe(4222);
  });

  test("returns null for unrelated lines", () => {
    expect(parsePort("Server is ready")).toBeNull();
  });

  test("does not match websocket line", () => {
    expect(
      parsePort("Listening for websocket clients on ws://0.0.0.0:8080")
    ).toBeNull();
  });
});

describe("parseWsPort", () => {
  test("extracts port from websocket listen line", () => {
    expect(
      parseWsPort("Listening for websocket clients on ws://0.0.0.0:33289")
    ).toBe(33289);
  });

  test("returns null for unrelated lines", () => {
    expect(parseWsPort("Server is ready")).toBeNull();
  });

  test("does not match TCP client line", () => {
    expect(
      parseWsPort("Listening for client connections on 127.0.0.1:4222")
    ).toBeNull();
  });
});
