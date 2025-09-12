import { UtmTemplate } from "@dub/prisma/client";

export const extractUtmParams = (utmTemplate: UtmTemplate) => ({
  utm_source: utmTemplate.utm_source,
  utm_medium: utmTemplate.utm_medium,
  utm_campaign: utmTemplate.utm_campaign,
  utm_term: utmTemplate.utm_term,
  utm_content: utmTemplate.utm_content,
  ref: utmTemplate.ref,
});
