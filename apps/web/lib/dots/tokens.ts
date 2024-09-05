import { redis } from "@/lib/upstash";
import { nanoid } from "@dub/utils";
import { TOKEN_CACHE_PREFIX, TOKEN_EXPIRE_IN_SECONDS } from "./constants";

export const createFlowToken = async ({
  workspaceId,
  affiliateId,
}: {
  workspaceId: string;
  affiliateId: string;
}) => {
  const token = nanoid(60);

  await redis.set(
    `${TOKEN_CACHE_PREFIX}:${token}`,
    {
      affiliateId,
      workspaceId,
    },
    {
      ex: TOKEN_EXPIRE_IN_SECONDS,
    },
  );

  return token;
};

export const getFlowToken = async (token: string) => {
  return redis.get<string>(`${TOKEN_CACHE_PREFIX}:${token}`);
};
