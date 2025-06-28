import { nanoid } from "@dub/utils";
import { checkIfKeyExists } from "./check-if-key-exists";

export async function getRandomKey({
  domain,
  length = 7,
  prefix,
}: {
  domain: string;
  length?: number;
  prefix?: string;
}): Promise<string> {
  /* recursively get random key till it gets one that's available */
  let key = nanoid(length);
  if (prefix) {
    key = `${prefix.replace(/^\/|\/$/g, "")}/${key}`;
  }

  const exists = await checkIfKeyExists({ domain, key });

  if (exists) {
    // by the off chance that key already exists
    return getRandomKey({ domain, length, prefix });
  } else {
    return key;
  }
}
