import { randomBytes } from "crypto";

export function generateRandomString(length: number): string {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const randomBytesArray = randomBytes(length);
  let result = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = randomBytesArray[i] % charset.length;
    result += charset[randomIndex];
  }

  return result;
}
