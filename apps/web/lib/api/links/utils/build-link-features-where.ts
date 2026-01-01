import { Prisma } from "@dub/prisma/client";

export function buildLinkFeaturesWhere(
  linkFeatures?: string[],
): Record<string, unknown> | undefined {
  if (!linkFeatures || linkFeatures.length === 0) {
    return undefined;
  }

  return {
    OR: linkFeatures.map((feature) => {
      switch (feature) {
        case "conversionTracking":
          return { trackConversion: true };
        case "customLinkPreview":
          return { proxy: true };
        case "geoTargeting":
          return { geo: { not: Prisma.DbNull } };
        case "utmTags":
          return {
            OR: [
              { utm_source: { not: null } },
              { utm_medium: { not: null } },
              { utm_campaign: { not: null } },
              { utm_term: { not: null } },
              { utm_content: { not: null } },
            ],
          };
        case "abTest":
          return { testVariants: { not: Prisma.DbNull } };
        case "tags":
          return { tags: { some: {} } };
        case "comments":
          return { comments: { not: null } };
        case "iosTargeting":
          return { ios: { not: null } };
        case "androidTargeting":
          return { android: { not: null } };
        case "expiration":
          return { expiresAt: { not: null } };
        case "password":
          return { password: { not: null } };
        case "linkCloaking":
          return { rewrite: true };
        case "searchEngineIndexing":
          return { doIndex: true };
        default:
          return {};
      }
    }),
  };
}
