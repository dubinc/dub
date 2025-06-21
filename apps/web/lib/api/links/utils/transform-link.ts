import { DiscountProps, PartnerProps } from "@/lib/types";
import { Dashboard, Link, Tag } from "@dub/prisma/client";
import { prefixWorkspaceId } from "../../workspace-id";
import { decodeLinkIfCaseSensitive } from "../case-sensitivity";

// used in API (e.g. transformLink)
// TODO: standardize this with ExpandedLinkProps
export type ExpandedLink = Link & {
  tags?: { tag: Pick<Tag, "id" | "name" | "color"> }[];
  webhooks?: { webhookId: string }[];
  dashboard?: Dashboard | null;
  partner?: Pick<PartnerProps, "id" | "name" | "image"> | null;
  discount?: Pick<
    DiscountProps,
    "id" | "amount" | "type" | "maxDuration" | "couponId" | "couponTestId"
  > | null;
};

// Transform link with additional properties
export const transformLink = (
  link: ExpandedLink,
  { skipDecodeKey = false }: { skipDecodeKey?: boolean } = {},
) => {
  const tags = (link.tags || []).map(({ tag }) => tag);
  const webhookIds = link.webhooks?.map(({ webhookId }) => webhookId) ?? [];

  if (!skipDecodeKey) {
    link = decodeLinkIfCaseSensitive(link);
  }

  // remove webhooks array, dashboard from link
  const { webhooks, dashboard, ...rest } = link;

  return {
    ...rest,
    identifier: null, // backwards compatibility
    tagId: tags?.[0]?.id ?? null, // backwards compatibility
    tags,
    webhookIds,
    qrCode: `https://api.dub.co/qr?url=${link.shortLink}?qr=1`,
    workspaceId: link.projectId ? prefixWorkspaceId(link.projectId) : null,
    ...(dashboard && { dashboardId: dashboard.id || null }),
  };
};

export const basicLink = (link: Link) => {
  // remove everything but the required data for link resolution
  // TODO: see about a more restricted Link query
  const { 
    id,
    domain,
    key,
    //url,
    //shortLink,
    archived,
    expiresAt,
    expiredUrl,
    password,
    trackConversion,
    proxy,
    title,
    description,
    image,
    video,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
    rewrite,
    doIndex,
    ios,
    android,
    geo,
    userId,
    projectId,
    programId,
    externalId,
    tenantId,
    publicStats,
    clicks,
    lastClicked,
    leads,
    sales,
    saleAmount,
    createdAt,
    updatedAt,
    comments,
    partnerId,
    //qrCode,
    folderId,
    ...rest 
  } = link;

  return {
    ...rest
  };
}
