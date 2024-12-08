import { Dashboard, Link, Tag } from "@dub/prisma";

export type ExpandedLink = Link & {
  tags?: { tag: Pick<Tag, "id" | "name" | "color"> }[];
  webhooks?: { webhookId: string }[];
  dashboard?: Dashboard | null;
};

// Transform link with additional properties
export const transformLink = (link: ExpandedLink) => {
  const tags = (link.tags || []).map(({ tag }) => tag);
  const webhookIds = link.webhooks?.map(({ webhookId }) => webhookId) ?? [];

  // remove webhooks array, dashboard from link
  const { webhooks, dashboard, ...rest } = link;

  return {
    ...rest,
    tagId: tags?.[0]?.id ?? null, // backwards compatibility
    tags,
    webhookIds,
    qrCode: `https://api.dub.co/qr?url=${link.shortLink}?qr=1`,
    workspaceId: link.projectId ? `ws_${link.projectId}` : null,
    ...(dashboard && { dashboardId: dashboard.id || null }),
  };
};
