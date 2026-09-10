import { DubApiError } from "@/lib/api/errors";
import { getSearchParamsWithArray } from "@dub/utils";
import * as z from "zod/v4";

// Returns an ID by default, or the (optionally serialized) entity when `expand` is true.
export function getExpandableField<TEntity, TExpanded = TEntity>({
  id,
  entity,
  expand,
  serialize,
}: {
  id: string | null | undefined;
  entity: TEntity | null | undefined;
  expand: boolean;
  serialize?: (entity: TEntity) => TExpanded;
}): string | TExpanded | TEntity | null {
  if (!expand) {
    return id ?? null;
  }

  if (entity == null) {
    return null;
  }

  return serialize ? serialize(entity) : entity;
}

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

// OpenAPI-friendly expand query param; callers supply the description.
export const getExpandFieldSchema = (description: string) =>
  z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe(description);
