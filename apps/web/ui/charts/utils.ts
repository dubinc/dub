/**
 * Finds all whole factors of a number
 */
export const getFactors = (number) =>
  [...Array(number + 1).keys()].filter((i) => number % i === 0);
