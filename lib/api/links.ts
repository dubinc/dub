import { redis } from "@/lib/redis";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  7
); // 7-character random string

export async function setRandomKey(
  url: string
): Promise<{ response: number; key: string }> {
  /* recursively set link till successful */
  const key = nanoid();
  const response = await redis.hsetnx(`dub.sh:links`, key, url); // add to hash
  if (response === 0) {
    // by the off chance that key already exists
    return setRandomKey(url);
  } else {
    return { response, key };
  }
}

export async function getRandomKey(): Promise<string> {
  /* recursively get random key till it gets one that's avaialble */
  const key = nanoid();
  const response = await redis.hexists(`dub.sh:links`, key); // check if key exists
  if (response === 1) {
    // by the off chance that key already exists
    return getRandomKey();
  } else {
    return key;
  }
}
