import { withTransientRetry } from "@/lib/api/partners/search/providers/resilience";
import { APIError } from "@turbopuffer/turbopuffer";
import { describe, expect, it, vi } from "vitest";

const apiError = (status: number) =>
  new APIError(status, {}, `status ${status}`, new Headers());

const failingOnce = (error: unknown) =>
  vi
    .fn()
    .mockRejectedValueOnce(error)
    .mockResolvedValueOnce("ok");

describe("withTransientRetry", () => {
  it.each([
    ["a rate limit", apiError(429)],
    ["a server error", apiError(503)],
    ["a network failure", new Error("fetch failed")],
  ])("retries %s", async (_label, error) => {
    const operation = failingOnce(error);

    await expect(withTransientRetry(operation)).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it.each([
    // The status comes from the typed error, not the message, so digits in an
    // ordinary message cannot make a permanent failure look transient.
    ["a message that merely contains 500", new Error("wrote 500 documents")],
    ["a client error", apiError(400)],
  ])("does not retry %s", async (_label, error) => {
    const operation = vi.fn().mockRejectedValue(error);

    await expect(withTransientRetry(operation)).rejects.toBe(error);
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
