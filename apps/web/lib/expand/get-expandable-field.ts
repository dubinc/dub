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

// OpenAPI-friendly expand query param; callers supply the description.
export const getExpandFieldSchema = (description: string) =>
  z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe(description);
