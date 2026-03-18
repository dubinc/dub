import { prisma } from "@dub/prisma";
import { Link } from "@dub/prisma/client";
import { cache } from "react";
import { encodeKeyIfCaseSensitive } from "./api/links/case-sensitivity";

const FEATURED_LINK_LIMIT = 12;

type LandingPageRootLink = Pick<
  Link,
  "title" | "description" | "image" | "video"
>;
type LandingPageLink = Pick<
  Link,
  | "id"
  | "domain"
  | "key"
  | "url"
  | "shortLink"
  | "title"
  | "description"
  | "image"
  | "clicks"
  | "createdAt"
  | "archived"
  | "rewrite"
  | "expiresAt"
  | "disabledAt"
  | "password"
>;

export function filterLandingPageLinks(
  links: LandingPageLink[],
  now: Date = new Date(),
) {
  return links
    .filter(
      (link) =>
        link.rewrite &&
        !link.archived &&
        !link.disabledAt &&
        !link.password &&
        link.url.length > 0 &&
        (!link.expiresAt || link.expiresAt > now),
    )
    .sort(
      (a, b) =>
        b.clicks - a.clicks || b.createdAt.getTime() - a.createdAt.getTime(),
    )
    .slice(0, FEATURED_LINK_LIMIT);
}

export function getLandingPageCopy({
  domain,
  rootLink,
  featuredLinks,
}: {
  domain: string;
  rootLink: LandingPageRootLink | null;
  featuredLinks: LandingPageLink[];
}) {
  const title =
    rootLink?.title ||
    (featuredLinks.length > 0 ? `Explore ${domain}` : `Welcome to ${domain}`);
  const description =
    rootLink?.description ||
    (featuredLinks.length > 0
      ? `Browse the featured links available on ${domain}.`
      : `${domain} is a branded short link domain powered by Dub.`);

  return {
    title,
    description,
    image: rootLink?.image || null,
    video: rootLink?.video || null,
    hasCustomContent: Boolean(
      rootLink?.title ||
        rootLink?.description ||
        rootLink?.image ||
        rootLink?.video ||
        featuredLinks.length,
    ),
  };
}

export const getCustomDomainLandingPageData = cache(async (domain: string) => {
  const rootKey = encodeKeyIfCaseSensitive({
    domain,
    key: "_root",
  });

  const [rootLink, links] = await Promise.all([
    prisma.link.findUnique({
      where: {
        domain_key: {
          domain,
          key: rootKey,
        },
      },
      select: {
        title: true,
        description: true,
        image: true,
        video: true,
      },
    }),
    prisma.link.findMany({
      where: {
        domain,
        key: {
          not: rootKey,
        },
      },
      select: {
        id: true,
        domain: true,
        key: true,
        url: true,
        shortLink: true,
        title: true,
        description: true,
        image: true,
        clicks: true,
        createdAt: true,
        archived: true,
        rewrite: true,
        expiresAt: true,
        disabledAt: true,
        password: true,
      },
    }),
  ]);

  return {
    rootLink: rootLink as LandingPageRootLink | null,
    featuredLinks: filterLandingPageLinks(links as LandingPageLink[]),
  };
});
