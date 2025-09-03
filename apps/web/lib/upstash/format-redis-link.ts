import { z } from "zod";
import { ExpandedLink } from "../api/links/utils/transform-link";
import { RedisLinkProps } from "../types";
import { ABTestVariantsSchema } from "../zod/schemas/links";

export function formatRedisLink(link: ExpandedLink): RedisLinkProps {
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
    programId,
    partnerId,
    partner,
    discount,
    testVariants,
    testCompletedAt,
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
      }),
    ...(expiresAt && { expiresAt: new Date(expiresAt) }),
    ...(expiredUrl && { expiredUrl }),
    ...(ios && { ios }),
    ...(android && { android }),
    ...(geo && { geo: geo as object }),
    ...(projectId && { projectId }), // projectId can be undefined for anonymous links
    ...(doIndex && { doIndex: true }),
    ...(webhookIds.length > 0 && { webhookIds }),
    ...(programId && { programId }),
    ...(partnerId && { partnerId }),
    ...(partner && {
      partner: {
        id: partner.id,
        name: partner.name,
        image: partner.image || `https://api.dub.co/og/avatar/${partner.id}`,
      },
    }),
    ...(discount && {
      discount: {
        id: discount.id,
        amount: discount.amount,
        type: discount.type,
        maxDuration: discount.maxDuration,
        couponId: discount.couponId,
        couponTestId: discount.couponTestId,
      },
    }),
    ...(Boolean(
      testVariants && testCompletedAt && new Date(testCompletedAt) > new Date(),
    ) && {
      testVariants: testVariants as z.infer<typeof ABTestVariantsSchema>,
      testCompletedAt: new Date(testCompletedAt!),
    }),
  };
}
