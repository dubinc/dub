import { expect, test } from "vitest";
import { capitalize } from "../functions/capitalize"; // Adjust the import path according to your file structure

test("capitalizes the first letter of a normal string", () => {
  const input = "hello";
  const expected = "Hello";
  expect(capitalize(input)).toBe(expected);
});

test("returns the string with leading space unchanged", () => {
  const input = " hello";
  const expected = " hello";
  expect(capitalize(input)).toBe(expected);
});

test("handles uppercase string correctly", () => {
  const input = "HELLO";
  const expected = "HELLO";
  expect(capitalize(input)).toBe(expected);
});

test("returns null for null input", () => {
  const input = null;
  const expected = null;
  expect(capitalize(input)).toBe(expected);
});

test("returns undefined for undefined input", () => {
  const input = undefined;
  const expected = undefined;
  expect(capitalize(input)).toBe(expected);
});

test("returns empty string unchanged", () => {
  const input = "";
  const expected = "";
  expect(capitalize(input)).toBe(expected);
});
