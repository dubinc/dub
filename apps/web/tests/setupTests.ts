import crypto from "node:crypto";
import { vi } from "vitest";
import { getTrustedSourcesHeaders } from "./utils/trusted-sources";

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
  ConsoleTransport: class {
    constructor(_config?: any) {}
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

// Attach Vercel Trusted Sources OIDC header to requests against the e2e
// deployment. Tokens are minted on demand from the GitHub Actions runner.
const originalFetch = globalThis.fetch.bind(globalThis);
const e2eBaseUrl = process.env.E2E_BASE_URL?.replace(/\/$/, "");

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const requestUrl =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;

  if (!e2eBaseUrl || !requestUrl.startsWith(e2eBaseUrl)) {
    return originalFetch(input, init);
  }

  const trustedHeaders = await getTrustedSourcesHeaders(originalFetch);
  if (Object.keys(trustedHeaders).length === 0) {
    return originalFetch(input, init);
  }

  const headers = new Headers(
    init?.headers ?? (input instanceof Request ? input.headers : undefined),
  );
  for (const [key, value] of Object.entries(trustedHeaders)) {
    headers.set(key, value);
  }

  return originalFetch(input, { ...init, headers });
}) as typeof fetch;
