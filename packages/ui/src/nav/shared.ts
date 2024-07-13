export const createHref = (href: string, domain: string) =>
  domain === "dub.co" ? href : `https://dub.co${href}`;

export type ContentProps = { domain: string };
