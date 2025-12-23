import crypto from "node:crypto";
import { vi } from "vitest";

Object.defineProperty(globalThis, "crypto", {
  value: crypto,
  writable: false, // Ensure it's not writable
  configurable: true, // Allow reconfiguration if needed
});

// Mock Axiom SDK modules to prevent initialization issues during tests
vi.mock("@axiomhq/js", () => ({
  Axiom: class {
    constructor(_config: any) {}
    ingest = vi.fn().mockResolvedValue(undefined);
    query = vi.fn().mockResolvedValue({ matches: [] });
  },
}));

vi.mock("@axiomhq/logging", () => ({
  AxiomJSTransport: class {
    constructor(_config: any) {}
  },
  Logger: class {
    constructor(_config: any) {}
    log = vi.fn();
    info = vi.fn();
    warn = vi.fn();
    error = vi.fn();
    flush = vi.fn().mockResolvedValue(undefined);
  },
  LogLevel: {
    info: "info",
    warn: "warn",
    error: "error",
  },
}));

vi.mock("@axiomhq/nextjs", () => ({
  createAxiomRouteHandler: vi.fn((logger, options) => {
    return (handler: any) => handler;
  }),
  nextJsFormatters: {},
  transformRouteHandlerSuccessResult: vi.fn(() => ["", {}]),
  createOnRequestError: vi.fn(() => vi.fn()),
  transformMiddlewareRequest: vi.fn(() => []),
}));
