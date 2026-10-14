export function resolvePartnerAssignedItem<T extends { id: string }>({
  assignedId,
  groupDefault,
  itemsById,
  loading,
}: {
  assignedId: string | null | undefined;
  groupDefault: T | null | undefined;
  itemsById: Map<string, T>;
  loading: boolean;
}): { item: T; isOverride: boolean } | null {
  if (assignedId) {
    const item = itemsById.get(assignedId);

    if (item) {
      return {
        item,
        isOverride: assignedId !== groupDefault?.id,
      };
    }

    if (groupDefault && (assignedId === groupDefault.id || loading)) {
      return {
        item: groupDefault,
        isOverride: false,
      };
    }

    return null;
  }

  if (groupDefault) {
    return {
      item: groupDefault,
      isOverride: false,
    };
  }

  return null;
}
