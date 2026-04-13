import { prisma } from "@dub/prisma";
import { ApiLogTB, EnrichedApiLog, WorkspaceWithUsers } from "../types";
import {
  PUBLISHABLE_KEY_ACTOR,
  PUBLISHABLE_KEY_REQUEST_PATHS,
  WEBHOOK_REQUEST_ACTORS_BY_PATH,
} from "./constants";

export async function enrichApiLogs({
  logs,
  workspace,
}: {
  logs: ApiLogTB | ApiLogTB[];
  workspace: WorkspaceWithUsers;
}): Promise<EnrichedApiLog | EnrichedApiLog[]> {
  const isSingle = !Array.isArray(logs);
  const logsArray: ApiLogTB[] = isSingle ? [logs] : logs;

  if (logsArray.length === 0) {
    return [];
  }

  const tokenIds = [
    ...new Set(logsArray.map((l) => l.token_id).filter(Boolean)),
  ];

  const userIds = [...new Set(logsArray.map((l) => l.user_id).filter(Boolean))];

  const [tokens, users] = await Promise.all([
    prisma.restrictedToken.findMany({
      where: {
        id: {
          in: tokenIds,
        },
      },
      select: {
        id: true,
        name: true,
        partialKey: true,
      },
    }),

    prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    }),
  ]);

  const tokenMap = new Map(tokens.map((t) => [t.id, t] as const));
  const userMap = new Map(users.map((u) => [u.id, u] as const));
  const webhookRequestActorsMap = new Map(
    Object.values(WEBHOOK_REQUEST_ACTORS_BY_PATH).map((actor) => [
      actor.id as string, // coerce back to string from const type
      { ...actor, email: null },
    ]),
  );

  const publishableKeyRequestPaths = new Set<string>(
    PUBLISHABLE_KEY_REQUEST_PATHS,
  );

  const publishableKeyToken = workspace.publishableKey
    ? {
        id: PUBLISHABLE_KEY_ACTOR.id,
        name: "",
        partialKey: `${workspace.publishableKey.slice(0, 3)}...${workspace.publishableKey.slice(-4)}`,
      }
    : null;

  const enriched = logsArray.map((log) => {
    const isPublishableKeyRequest = publishableKeyRequestPaths.has(
      log.route_pattern,
    );

    return {
      ...log,
      // timestamp is always in UTC
      timestamp: new Date(log.timestamp + "Z").toISOString(),
      token: isPublishableKeyRequest
        ? publishableKeyToken
        : log.token_id
          ? tokenMap.get(log.token_id) ?? null
          : null,
      user: isPublishableKeyRequest
        ? PUBLISHABLE_KEY_ACTOR
        : log.user_id
          ? webhookRequestActorsMap.get(log.user_id) ??
            userMap.get(log.user_id) ??
            null
          : null,
    };
  });

  return isSingle ? enriched[0] : enriched;
}
