/**
 * Wraps the provided item in an array if it isn't already one
 */
export function ensureArray<T>(itemOrArray: T | T[]) {
  return Array.isArray(itemOrArray) ? itemOrArray : [itemOrArray];
}
