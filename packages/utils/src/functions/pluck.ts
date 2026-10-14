// Extracts a property from each object in an array.
// Example: pluck([{ id: "a" }, { id: "b" }], "id") => ["a", "b"]
export const pluck = <T, K extends keyof T>(
  items: readonly T[],
  key: K,
): T[K][] => {
  return items.map((item) => item[key]);
};
