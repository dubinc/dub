import { ProcessedLinkProps } from "@/lib/types";
import { constructURLFromUTMParams } from "@dub/utils";
import { UtmTemplate } from "@prisma/client";
import { extractAndResolveUtmParams } from "./extract-and-resolve-utm-params";

// Applies a group's UTM template to a processed partner link before createLink / updateLink
export function applyGroupUtmToLink<T extends ProcessedLinkProps>({
  link,
  utmTemplate,
  partnerName,
}: {
  link: T;
  utmTemplate:
    | Pick<
        UtmTemplate,
        | "utm_source"
        | "utm_medium"
        | "utm_campaign"
        | "utm_term"
        | "utm_content"
        | "ref"
      >
    | null
    | undefined;
  partnerName?: string | null;
}): T {
  if (!utmTemplate) {
    return link;
  }

  const utmContext = {
    partnerName: partnerName || link.key,
    partnerLinkKey: link.key,
  };

  const resolvedUtmParams = extractAndResolveUtmParams(utmTemplate, utmContext);
  const resolvedUtmColumns = extractAndResolveUtmParams(
    utmTemplate,
    utmContext,
    { excludeRef: true },
  );

  return {
    ...link,
    ...resolvedUtmColumns,
    url: constructURLFromUTMParams(link.url, resolvedUtmParams),
  };
}
