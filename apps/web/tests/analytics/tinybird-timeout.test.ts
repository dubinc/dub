import { getAnalytics } from "@/lib/analytics/get-analytics";
import { getEvents } from "@/lib/analytics/get-events";
import { DubApiError } from "@/lib/api/errors";
import { tb } from "@/lib/tinybird";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/tinybird", () => ({
  tb: { buildPipe: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

vi.mock("@/lib/planetscale", () => ({
  conn: { execute: vi.fn() },
}));

const buildPipeMock = vi.mocked(tb.buildPipe);

function mockPipeError(error: Error) {
  buildPipeMock.mockReturnValue(vi.fn().mockRejectedValue(error) as any);
}

const timeoutError = new Error(
  "[Error] Timeout exceeded: elapsed 30002 ms, maximum: 30000 ms.",
);

describe("Tinybird timeout", () => {
  beforeEach(() => {
    buildPipeMock.mockReset();
  });

  it("getAnalytics throws a bad_request error when the pipe times out", async () => {
    mockPipeError(timeoutError);

    const error = await getAnalytics({
      event: "clicks",
      groupBy: "count",
      workspaceId: "ws_test",
      interval: "all",
    }).catch((error) => error);

    expect(error).toBeInstanceOf(DubApiError);
    expect(error.code).toBe("bad_request");
  });

  it("getEvents throws a bad_request error when the pipe times out", async () => {
    mockPipeError(timeoutError);

    const error = await getEvents({
      event: "clicks",
      workspaceId: "ws_test",
      interval: "24h",
      page: 1,
      limit: 10,
      sortBy: "timestamp",
    }).catch((error) => error);

    expect(error).toBeInstanceOf(DubApiError);
    expect(error.code).toBe("bad_request");
  });

  it("rethrows other pipe errors unchanged", async () => {
    const otherError = new Error("Connection reset");
    mockPipeError(otherError);

    const error = await getAnalytics({
      event: "clicks",
      groupBy: "count",
      workspaceId: "ws_test",
      interval: "all",
    }).catch((error) => error);

    expect(error).toBe(otherError);
  });
});
