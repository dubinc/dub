import { isIframeable } from "@dub/utils";
import { LinkProps, RedisLinkProps } from "../types";

export async function formatRedisLink(
  link: LinkProps & {
    webhooks?: { webhookId: string }[];
  },
): Promise<RedisLinkProps> {
  const {
    id,
    domain,
    url,
    trackConversion,
    password,
    proxy,
    rewrite,
    expiresAt,
    expiredUrl,
    ios,
    android,
    geo,
    doIndex,
    projectId,
    webhooks,
  } = link;

  const webhookIds = webhooks?.map(({ webhookId }) => webhookId) ?? [];

  return {
    id,
    ...(url && { url }), // on free plans you cannot set a root domain redirect, hence URL is undefined
    ...(trackConversion && { trackConversion: true }),
    ...(password && password.length > 0 && { password: true }),
    ...(proxy && { proxy: true }),
    ...(url &&
      rewrite && {
        rewrite: true,
        iframeable: await isIframeable({ url, requestDomain: domain }),
      }),
    ...(expiresAt && { expiresAt: new Date(expiresAt) }),
    ...(expiredUrl && { expiredUrl }),
    ...(ios && { ios }),
    ...(android && { android }),
    ...(geo && { geo: geo as object }),
    ...(projectId && { projectId }), // projectId can be undefined for anonymous links
    ...(doIndex && { doIndex: true }),
    ...(webhookIds.length > 0 && { webhookIds }),
  };
}
