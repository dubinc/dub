import { redis } from "@/lib/upstash";

import { createId } from "@/lib/api/create-id";
import {
  EMBED_PUBLIC_TOKEN_EXPIRY,
  EMBED_PUBLIC_TOKEN_PREFIX,
} from "../constants";

interface ReferralsEmbedTokenProps {
  programId: string;
  partnerId: string;
}

class ReferralsEmbedToken {
  async create(props: ReferralsEmbedTokenProps) {
    const publicToken = createId({
      prefix: EMBED_PUBLIC_TOKEN_PREFIX,
    });

    await redis.set(publicToken, JSON.stringify(props), {
      ex: EMBED_PUBLIC_TOKEN_EXPIRY,
      nx: true,
    });

    return {
      publicToken,
      expires: new Date(Date.now() + EMBED_PUBLIC_TOKEN_EXPIRY),
    };
  }

  async get(token: string) {
    return await redis.get<ReferralsEmbedTokenProps>(token);
  }
}

export const referralsEmbedToken = new ReferralsEmbedToken();
