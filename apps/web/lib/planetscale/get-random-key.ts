import { nanoid } from "@dub/utils";

export async function getRandomKey({
  prefix,
  long,
}: {
  prefix?: string;
  long?: boolean;
}): Promise<string> {
  let key = long ? nanoid(69) : nanoid();

  if (prefix) {
    key = `${prefix.replace(/^\/|\/$/g, "")}/${key}`;
  }

  return key;
}
