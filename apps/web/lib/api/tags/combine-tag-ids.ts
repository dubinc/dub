/**
 * Combines tagIds into a single string array or undefined from tagId and tagIds arguments
 */
export function combineTagIds({
  tagId,
  tagIds,
}: {
  tagId?: string | null;
  tagIds?: string[];
}): string[] | undefined {
  // Use tagIds if present, fall back to tagId
  if (tagIds && Array.isArray(tagIds)) {
    // remove duplicates
    return [...new Set(tagIds)];
  }
  return tagId === null ? [] : tagId !== undefined ? [tagId] : undefined;
}
