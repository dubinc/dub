import { ProcessedLinkProps } from "../../../types";

export const checkIfLinksHaveWebhooks = (links: ProcessedLinkProps[]) =>
  links.some((link) => link.webhookIds?.length);
