import { NewLinkProps } from "@/lib/types";
import { combineWords } from "@dub/utils";

export const proFeaturesCheck = (payload: NewLinkProps) => {
  const {
    proxy,
    password,
    rewrite,
    expiresAt,
    ios,
    android,
    geo,
    testVariants,
    trackConversion,
    doIndex,
  } = payload;

  if (
    proxy ||
    password ||
    rewrite ||
    expiresAt ||
    ios ||
    android ||
    geo ||
    testVariants ||
    trackConversion ||
    doIndex
  ) {
    const proFeaturesString = combineWords(
      [
        proxy && "custom link previews",
        password && "password protection",
        rewrite && "link cloaking",
        expiresAt && "link expiration",
        ios && "iOS targeting",
        android && "Android targeting",
        geo && "geo targeting",
        doIndex && "search engine indexing",
      ].filter(Boolean) as string[],
    );

    throw new Error(
      `You can only use ${proFeaturesString} on a Pro plan and above. Upgrade to Pro to use these features.`,
    );
  }
};

export const businessFeaturesCheck = (payload: NewLinkProps) => {
  const { testVariants, trackConversion } = payload;

  if (testVariants || trackConversion) {
    const businessFeaturesString = combineWords(
      [
        testVariants && "A/B testing",
        trackConversion && "conversion tracking",
      ].filter(Boolean) as string[],
    );

    throw new Error(
      `You can only use ${businessFeaturesString} on a Business plan and above. Upgrade to Business to use these features.`,
    );
  }
};
