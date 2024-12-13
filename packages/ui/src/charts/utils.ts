/**
 * Calculates and returns all whole factors of a given positive integer.
 * A factor of a number is a whole number that can be divided evenly into the number,
 * meaning without leaving a remainder. This function efficiently generates a list of
 * such factors for any given positive integer by iterating through all possible
 * candidates (from 1 to the number itself) and checking divisibility.
 *
 * @param {number} number - The positive integer for which to find all whole factors.
 *                          It should be a non-negative integer, as negative numbers
 *                          and non-integers are not handled by this function.
 * @returns {number[]} An array of numbers representing all the whole factors of
 *                     the input number, including 1 and the number itself if applicable.
 *
 * Example usage:
 * getFactors(12); // returns [1, 2, 3, 4, 6, 12]
 * getFactors(7);  // returns [1, 7]
 */
export const getFactors = (number: number) =>
  [...Array(number + 1).keys()].filter((i) => number % i === 0);
