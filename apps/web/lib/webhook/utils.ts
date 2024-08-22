import { prisma } from "@/lib/prisma";
import { formatRedisLink, redis } from "@/lib/upstash";
import { Webhook } from "@prisma/client";

interface TransformWebhookProps
  extends Pick<Webhook, "id" | "name" | "url" | "secret" | "triggers"> {
  linkWebhooks: { linkId: string }[];
}

// Transform webhook
export const transformWebhook = (webhook: TransformWebhookProps) => {
  return {
    id: webhook.id,
    name: webhook.name,
    url: webhook.url,
    secret: webhook.secret,
    triggers: webhook.triggers,
    linkIds: webhook.linkWebhooks.map((linkWebhook) => linkWebhook.linkId),
  };
};

// Update webhooks in redis for a link
export const updateLinksInRedis = async ({
  linkIds,
  webhook,
}: {
  linkIds: string[];
  webhook: Pick<Webhook, "id" | "url" | "secret" | "triggers">;
}) => {
  const links = await prisma.link.findMany({
    where: {
      id: { in: linkIds },
    },
  });

  const pipeline = redis.pipeline();

  const formatedLinks = await Promise.all(
    links.map(async (link) => {
      return {
        ...(await formatRedisLink(link)),
        webhook: {
          id: webhook.id,
          url: webhook.url,
          secret: webhook.secret,
          triggers: webhook.triggers,
        },
      };
    }),
  );

  // formatedLinks.map((formatedLink) => {
  //   const { webhook, ...rest } = formatedLink;

  //   pipeline.hset(link.key.toLowerCase(), {
  //     [formatedLink.key]: rest,
  //   });
  // });

  // await pipeline.exec();
};
