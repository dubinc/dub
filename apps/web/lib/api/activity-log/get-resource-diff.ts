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

// Extracts old and new values from a jsondiffpatch delta entry
function extractDiffValue(
  deltaValue: unknown,
  oldValue: unknown,
  newValue: unknown,
): DiffValue {
  if (!Array.isArray(deltaValue)) {
    if (deltaValue && typeof deltaValue === "object") {
      return { old: oldValue, new: newValue };
    }
    return { old: oldValue, new: newValue };
  }

  if (deltaValue.length === 2) {
    return { old: deltaValue[0], new: deltaValue[1] };
  }

  if (deltaValue.length === 1) {
    return { old: undefined, new: deltaValue[0] };
  }

  if (deltaValue.length === 3 && deltaValue[1] === 0 && deltaValue[2] === 0) {
    return { old: deltaValue[0], new: undefined };
  }

  return { old: oldValue, new: newValue };
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
  oldResource: Record<string, unknown> | unknown[],
  newResource: Record<string, unknown> | unknown[],
  options?: GetResourceDiffOptions,
): ResourceDiff | null => {
  const { fields } = options ?? {};

  const diffpatcher = jsondiffpatch.create({
    propertyFilter: fields
      ? (name: string) => fields.includes(name)
      : undefined,
  });

  const delta = diffpatcher.diff(oldResource, newResource);

  if (!delta) {
    return null;
  }

  const result: ResourceDiff = {};
  const isArrayDiff = Array.isArray(oldResource) || Array.isArray(newResource);

  for (const [key, deltaValue] of Object.entries(delta)) {
    if (key === "_t") continue;

    if (isArrayDiff) {
      const diffValue = extractDiffValue(deltaValue, undefined, undefined);

      if (
        diffValue.old === undefined &&
        diffValue.new === undefined &&
        deltaValue &&
        typeof deltaValue === "object" &&
        !Array.isArray(deltaValue)
      ) {
        continue;
      }

      result[key] = diffValue;
    } else {
      const oldValue = (oldResource as Record<string, unknown>)[key];
      const newValue = (newResource as Record<string, unknown>)[key];
      result[key] = extractDiffValue(deltaValue, oldValue, newValue);
    }
  }

  return Object.keys(result).length > 0 ? result : null;
};
