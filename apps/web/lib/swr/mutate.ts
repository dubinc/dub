import { mutate } from "swr";

export const mutatePrefix = async (prefix: string | string[]) => {
  await mutate(
    (key) =>
      typeof key === "string" &&
      (Array.isArray(prefix)
        ? prefix.some((p) => key.startsWith(p))
        : key.startsWith(prefix)),
    undefined,
    { revalidate: true },
  );
};

export const mutateSuffix = async (suffix: string | string[]) => {
  await mutate(
    (key) =>
      typeof key === "string" &&
      (Array.isArray(suffix)
        ? suffix.some((s) => key.endsWith(s))
        : key.endsWith(suffix)),
    undefined,
    {
      revalidate: true,
    },
  );
};
