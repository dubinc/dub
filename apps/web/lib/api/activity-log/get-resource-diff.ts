import * as jsondiffpatch from "jsondiffpatch";

type DiffValue = {
  old: unknown;
  new: unknown;
};

export type ResourceDiff = Record<string, DiffValue>;

interface GetResourceDiffOptions {
  /** If provided, only compare these specific fields */
  fields?: string[];
}

/**
 * Computes the diff between old and new resource objects using jsondiffpatch.
 * Only returns fields that have changed.
 *
 * @param oldResource - The original resource object
 * @param newResource - The updated resource object
 * @param options - Optional configuration
 * @param options.fields - If provided, only compare these specific fields
 * @returns An object containing only the changed fields with their old and new values,
 *          or null if there are no changes
 */
export const getResourceDiff = (
  oldResource: Record<string, unknown>,
  newResource: Record<string, unknown>,
  options?: GetResourceDiffOptions,
): ResourceDiff | null => {
  const { fields } = options ?? {};

  const filteredOld = fields
    ? Object.fromEntries(fields.map((f) => [f, oldResource[f]]))
    : oldResource;

  const filteredNew = fields
    ? Object.fromEntries(fields.map((f) => [f, newResource[f]]))
    : newResource;

  const delta = jsondiffpatch.diff(filteredOld, filteredNew);

  if (!delta) {
    return null;
  }

  const result: ResourceDiff = {};

  for (const [key, value] of Object.entries(delta)) {
    if (!Array.isArray(value)) {
      // Nested object change - store as-is
      result[key] = {
        old: filteredOld[key],
        new: filteredNew[key],
      };
    } else if (value.length === 2) {
      // Modified: [oldValue, newValue]
      result[key] = {
        old: value[0],
        new: value[1],
      };
    } else if (value.length === 1) {
      // Added: [newValue]
      result[key] = {
        old: undefined,
        new: value[0],
      };
    } else if (value.length === 3 && value[1] === 0 && value[2] === 0) {
      // Deleted: [oldValue, 0, 0]
      result[key] = {
        old: value[0],
        new: undefined,
      };
    }
  }

  return Object.keys(result).length > 0 ? result : null;
};
