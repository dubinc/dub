import { redis } from "@/lib/upstash";
import { destructureEmail } from "@dub/utils";

export const isDisposableEmail = async (email: string) => {
  const { domain } = destructureEmail(email);

  return await redis.sismember("disposableEmailDomains", domain);
};
