import { isIframeable } from "@dub/utils";
import { LinkProps, RedisLinkProps } from "../types";

export async function formatRedisLink(
  link: LinkProps & { webhookIds?: string[] },
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
    webhookIds,
  } = link;
  const hasPassword = password && password.length > 0 ? true : false;

  return {
    id,
    ...(url && { url }), // on free plans you cannot set a root domain redirect, hence URL is undefined
    ...(trackConversion && { trackConversion: true }),
    ...(hasPassword && { password: true }),
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
    ...(webhookIds && { webhookIds }),
  };
}
