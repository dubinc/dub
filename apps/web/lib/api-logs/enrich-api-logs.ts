import { prisma } from "@dub/prisma";
import { ApiLogTB, EnrichedApiLog } from "../types";

const WEBHOOK_REQUEST_ACTORS: Record<
  string,
  { id: string; name: string; image: string }
> = {
  "/appsflyer/webhook": {
    id: "appsflyer",
    name: "AppsFlyer",
    image:
      "https://dubassets.com/integrations/int_1KN8JP7ET3VQQRF7ZQEVNFPJ5_2Geprc8",
  },
  "/stripe/integration/webhook": {
    id: "stripe",
    name: "Stripe",
    image:
      "https://dubassets.com/integrations/clzra1ya60001wnj4a89zcg9h_jtyaGa7",
  },
  "/shopify/integration/webhook": {
    id: "shopify",
    name: "Shopify",
    image:
      "https://dubassets.com/integrations/int_iWOtrZgmcyU6XDwKr4AYYqLN_jUmF77W",
  },
};

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

  const enriched = logsArray.map((log) => ({
    ...log,
    token: log.token_id ? tokenMap.get(log.token_id) ?? null : null,
    user: WEBHOOK_REQUEST_ACTORS[log.path]
      ? {
          ...WEBHOOK_REQUEST_ACTORS[log.path],
          email: null,
        }
      : log.user_id
        ? userMap.get(log.user_id) ?? null
        : null,
  }));

  return isSingle ? enriched[0] : enriched;
}
