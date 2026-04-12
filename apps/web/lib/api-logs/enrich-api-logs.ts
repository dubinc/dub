import { prisma } from "@dub/prisma";
import { ApiLogTB, EnrichedApiLog } from "../types";
import { WEBHOOK_REQUEST_ACTORS_BY_PATH } from "./constants";

export async function enrichApiLogs(
  logs: ApiLogTB | ApiLogTB[],
): Promise<EnrichedApiLog | EnrichedApiLog[]> {
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

  const enriched = logsArray.map((log) => ({
    ...log,
    token: log.token_id ? tokenMap.get(log.token_id) ?? null : null,
    user: log.user_id
      ? webhookRequestActorsMap.get(log.user_id) ??
        userMap.get(log.user_id) ??
        null
      : null,
  }));

  return isSingle ? enriched[0] : enriched;
}
