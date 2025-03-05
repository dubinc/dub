import { Dashboard, Link, Tag } from "@dub/prisma/client";
import { CASE_SENSITIVE_DOMAINS, decodeKey } from "../constants";

// used in API (e.g. transformLink)
// TODO: standardize this with ExpandedLinkProps
export type ExpandedLink = Link & {
  tags?: { tag: Pick<Tag, "id" | "name" | "color"> }[];
  webhooks?: { webhookId: string }[];
  dashboard?: Dashboard | null;
};

// Transform link with additional properties
export const transformLink = (link: ExpandedLink) => {
  const tags = (link.tags || []).map(({ tag }) => tag);
  const webhookIds = link.webhooks?.map(({ webhookId }) => webhookId) ?? [];

  if (CASE_SENSITIVE_DOMAINS.includes(link.domain)) {
    const originalKey = decodeKey(link.key);
    console.log("originalKey", originalKey);

    link.shortLink = link.shortLink.replace(link.key, originalKey);
    link.key = originalKey;
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
    workspaceId: link.projectId ? `ws_${link.projectId}` : null,
    ...(dashboard && { dashboardId: dashboard.id || null }),
  };
};
