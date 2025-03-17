import { ExpandedLink } from "../api/links/utils/transform-link";
import { DiscountProps, PartnerProps, RedisLinkProps } from "../types";

interface FormatRedisLinkProps extends ExpandedLink {
  partner: Pick<PartnerProps, "id" | "name" | "image">;
  discount: Pick<
    DiscountProps,
    "id" | "maxDuration" | "amount" | "type" | "couponId" | "couponTestId"
  >;
}

export function formatRedisLink(link: FormatRedisLinkProps): RedisLinkProps {
  const {
    id,
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
    partner,
    discount,
  } = link;

  const webhookIds = webhooks?.map(({ webhookId }) => webhookId) ?? [];

  console.log("formatRedisLink", {
    partner,
    discount,
  });

  return {
    id,
    ...(url && { url }), // on free plans you cannot set a root domain redirect, hence URL is undefined
    ...(trackConversion && { trackConversion: true }),
    ...(password && password.length > 0 && { password: true }),
    ...(proxy && { proxy: true }),
    ...(url &&
      rewrite && {
        rewrite: true,
      }),
    ...(expiresAt && { expiresAt: new Date(expiresAt) }),
    ...(expiredUrl && { expiredUrl }),
    ...(ios && { ios }),
    ...(android && { android }),
    ...(geo && { geo: geo as object }),
    ...(projectId && { projectId }), // projectId can be undefined for anonymous links
    ...(doIndex && { doIndex: true }),
    ...(webhookIds.length > 0 && { webhookIds }),
    ...(partner && { partner }),
    ...(discount && { discount }),
  };
}
