// Picks a subset of properties from an object and returns a new object
// containing only the specified keys.
export const pick = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> => {
  return Object.fromEntries(keys.map((key) => [key, obj[key]])) as Pick<T, K>;
};
