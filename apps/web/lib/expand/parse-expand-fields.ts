import { DubApiError } from "@/lib/api/errors";
import { getSearchParamsWithArray } from "@dub/utils";

// Parses `expand` / `expand[]` from a request URL. Throws if any value is not allowed.
export function parseExpandFields<const T extends readonly string[]>({
  url,
  allowedFields,
}: {
  url: string;
  allowedFields: T;
}): Set<T[number]> {
  const searchParams = getSearchParamsWithArray(url);
  const raw = searchParams.expand ?? searchParams["expand[]"] ?? [];
  const values = (Array.isArray(raw) ? raw : [raw]).filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );

  const uniqueValues = [...new Set(values)];
  const allowed = new Set<string>(allowedFields);
  const invalid = uniqueValues.filter((value) => !allowed.has(value));

  if (invalid.length > 0) {
    throw new DubApiError({
      code: "bad_request",
      message: `Invalid expand field(s): ${invalid.join(", ")}. Allowed: ${allowedFields.join(", ")}.`,
    });
  }

  return new Set(uniqueValues as T[number][]);
}
