const OPTIMISTIC_ID_PREFIX = "tmp_";

// Optimistic messages are created with a temporary id, then replaced by the
// persisted message. Remember that pair so the thread can keep one React key
// and not mount the same message a second time.
const stableKeyByMessageId = new Map<string, string>();
const serverIdByOptimisticId = new Map<string, string>();

export function linkOptimisticMessage(optimisticId: string, serverId: string) {
  stableKeyByMessageId.set(optimisticId, optimisticId);
  stableKeyByMessageId.set(serverId, optimisticId);
  serverIdByOptimisticId.set(optimisticId, serverId);
}

export function stableMessageKey(messageId: string) {
  return stableKeyByMessageId.get(messageId) ?? messageId;
}

export function appendPersistedMessage<T extends { id: string }>(
  messages: T[],
  optimisticId: string,
  persisted: T,
) {
  linkOptimisticMessage(optimisticId, persisted.id);

  return [
    ...messages.filter(
      (message) => message.id !== optimisticId && message.id !== persisted.id,
    ),
    persisted,
  ];
}

export function reconcileMessages<T extends { id: string }>(messages: T[]) {
  const serverIds = new Set(
    messages
      .filter((message) => !message.id.startsWith(OPTIMISTIC_ID_PREFIX))
      .map((message) => message.id),
  );

  const seenKeys = new Set<string>();

  return messages.flatMap((message) => {
    if (message.id.startsWith(OPTIMISTIC_ID_PREFIX)) {
      const serverId = serverIdByOptimisticId.get(message.id);
      if (serverId && serverIds.has(serverId)) return [];
    }

    const key = stableMessageKey(message.id);
    if (seenKeys.has(key)) return [];
    seenKeys.add(key);

    return [{ message, key }];
  });
}
