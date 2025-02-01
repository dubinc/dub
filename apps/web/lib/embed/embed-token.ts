import { redis } from "@/lib/upstash";
import { createId } from "../api/utils";
import {
  EMBED_PUBLIC_TOKEN_EXPIRY,
  EMBED_PUBLIC_TOKEN_LENGTH,
  EMBED_PUBLIC_TOKEN_PREFIX,
} from "./constants";

interface EmbedTokenProps {
  programId: string;
  partnerId: string;
}

class EmbedToken {
  async create(props: EmbedTokenProps) {
    const publicToken = createId({
      prefix: EMBED_PUBLIC_TOKEN_PREFIX,
      length: EMBED_PUBLIC_TOKEN_LENGTH,
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
    return await redis.get<EmbedTokenProps>(token);
  }
}

export const embedToken = new EmbedToken();
