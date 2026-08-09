import { nanoid } from "@dub/utils";

export function randomName(prefix = "e2e", length = 5) {
  return `${prefix}-${nanoid(length)}`;
}
