import { UtmTemplate } from "@dub/prisma/client";

export const extractUtmParams = (
  utmTemplate?: Pick<
    UtmTemplate,
    | "utm_source"
    | "utm_medium"
    | "utm_campaign"
    | "utm_term"
    | "utm_content"
    | "ref"
  > | null,
  { excludeRef = false }: { excludeRef?: boolean } = {},
) => {
  // if there is no utm template, return null for all utm params
  if (!utmTemplate)
    return {
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_term: null,
      utm_content: null,
      ...(excludeRef ? {} : { ref: null }),
    };
  return {
    utm_source: utmTemplate.utm_source,
    utm_medium: utmTemplate.utm_medium,
    utm_campaign: utmTemplate.utm_campaign,
    utm_term: utmTemplate.utm_term,
    utm_content: utmTemplate.utm_content,
    ...(excludeRef ? {} : { ref: utmTemplate.ref }),
  };
};
