// Runs a batch operation up to `maxBatches` times in a single invocation.
// Use in cron jobs/background workers when you need to process a large set of rows without exceeding the function timeout.
// Each call to `processBatch` should itself be limited (e.g. Prisma `updateMany`/`deleteMany` with `limit`)
export async function processInBatches(
  maxBatches: number,
  processBatch: () => Promise<{ count: number }>,
): Promise<{ hasMore: boolean }> {
  for (let batch = 0; batch < maxBatches; batch++) {
    const { count } = await processBatch();

    if (count === 0) {
      return {
        hasMore: false,
      };
    }
  }

  // Exhausted allowed batches. There may still be work left.
  return {
    hasMore: true,
  };
}
