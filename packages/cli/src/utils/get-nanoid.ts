import { customAlphabet } from "nanoid";

const alphabet =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function getNanoid(length: number = 7) {
  const nanoid = customAlphabet(alphabet, length);

  return nanoid();
}
