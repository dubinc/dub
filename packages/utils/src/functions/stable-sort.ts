/**
 * Sorts an array using the specified compare function, preserving the order
 * of elements that compare equally.
 */
export const stableSort = <T>(arr: T[], compare: (a: T, b: T) => number) =>
  arr
    .map((item, index) => ({ item, index }))
    .sort((a, b) => compare(a.item, b.item) || a.index - b.index)
    .map(({ item }) => item);
