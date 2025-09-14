import { UtmTemplate } from "@dub/prisma/client";

export const extractUtmParams = (
  utmTemplate: UtmTemplate | null,
  { excludeRef = false }: { excludeRef?: boolean } = {},
) => {
  if (!utmTemplate) return {};
  return {
    utm_source: utmTemplate.utm_source,
    utm_medium: utmTemplate.utm_medium,
    utm_campaign: utmTemplate.utm_campaign,
    utm_term: utmTemplate.utm_term,
    utm_content: utmTemplate.utm_content,
    ...(excludeRef ? {} : { ref: utmTemplate.ref }),
  };
};
