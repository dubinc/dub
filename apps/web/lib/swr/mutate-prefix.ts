import { mutate } from "swr";

export const mutatePrefix = (prefix: string) => {
  mutate(
    (key) => typeof key === "string" && key.startsWith(prefix),
    undefined,
    { revalidate: true },
  );
};
