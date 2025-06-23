import { nanoid } from "@dub/utils";

export function getRandomKey({
  prefix,
  long,
}: {
  prefix?: string;
  long?: boolean;
}) {
  let key = long ? nanoid(69) : nanoid();

  if (prefix) {
    key = `${prefix.replace(/^\/|\/$/g, "")}/${key}`;
  }

  return key;
}
