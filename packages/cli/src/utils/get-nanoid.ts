import { customAlphabet } from "nanoid"

export function getNanoid() {
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz"
  const nanoid = customAlphabet(alphabet, 10)
  return nanoid(7)
}
