import { processInBatches } from "@dub/utils";
import { describe, expect, it, vi } from "vitest";

describe("processInBatches", () => {
  it("returns hasMore: false when the first batch processes nothing", async () => {
    const processBatch = vi.fn().mockResolvedValue({ count: 0 });

    const result = await processInBatches(5, processBatch);

    expect(result).toEqual({ hasMore: false });
    expect(processBatch).toHaveBeenCalledTimes(1);
  });

  it("stops early and returns hasMore: false when a later batch is empty", async () => {
    const processBatch = vi
      .fn()
      .mockResolvedValueOnce({ count: 10 })
      .mockResolvedValueOnce({ count: 10 })
      .mockResolvedValueOnce({ count: 0 });

    const result = await processInBatches(5, processBatch);

    expect(result).toEqual({ hasMore: false });
    expect(processBatch).toHaveBeenCalledTimes(3);
  });

  it("returns hasMore: true after exhausting maxBatches with remaining work", async () => {
    const processBatch = vi.fn().mockResolvedValue({ count: 10 });

    const result = await processInBatches(3, processBatch);

    expect(result).toEqual({ hasMore: true });
    expect(processBatch).toHaveBeenCalledTimes(3);
  });

  it("throws when maxBatches is 0", async () => {
    const processBatch = vi.fn().mockResolvedValue({ count: 10 });

    await expect(processInBatches(0, processBatch)).rejects.toThrow(
      "maxBatches must be greater than 0.",
    );
    expect(processBatch).not.toHaveBeenCalled();
  });

  it("propagates errors from processBatch", async () => {
    const processBatch = vi.fn().mockRejectedValue(new Error("batch failed"));

    await expect(processInBatches(5, processBatch)).rejects.toThrow(
      "batch failed",
    );
    expect(processBatch).toHaveBeenCalledTimes(1);
  });
});
