import { customAlphabet } from "nanoid";

export const nanoid = (chars?: number) => {
  return customAlphabet(
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
    chars || 7, // 7-character random string by default
  )();
};
