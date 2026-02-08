export const isFulfilled = <T>(
  p: PromiseSettledResult<T>,
): p is PromiseFulfilledResult<T> => p.status === "fulfilled";

export const isRejected = <T>(
  p: PromiseSettledResult<T>,
): p is PromiseRejectedResult => p.status === "rejected";

export function logPromiseResults<T>(
  results: PromiseSettledResult<T>[],
  options?: {
    label?: string;
    items?: { id?: string | number }[]; // optional matching array to show context
  },
) {
  const { label = "Task", items = [] } = options || {};

  let successCount = 0;
  let failureCount = 0;

  for (const [index, result] of results.entries()) {
    const id = items[index]?.id ? ` [${items[index]?.id}]` : "";

    if (result.status === "fulfilled") {
      successCount++;
      console.log(`${label}${id} succeeded.`);
    } else {
      failureCount++;
      const reason =
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason);
      console.error(`${label}${id} failed: ${reason}`);
    }
  }

  return {
    successCount,
    failureCount,
  };
}
