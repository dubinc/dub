import { Link, Tag } from "@prisma/client";

export type LinkWithTags = Link & {
  tags?: { tag: Pick<Tag, "id" | "name" | "color"> }[];
  webhooks?: { webhookId: string }[];
};

// Transform link with additional properties
export const transformLink = (link: LinkWithTags) => {
  const tags = (link.tags || []).map(({ tag }) => tag);
  const webhookIds = link.webhooks?.map(({ webhookId }) => webhookId) ?? [];

  return {
    ...link,
    tagId: tags?.[0]?.id ?? null, // backwards compatibility
    tags,
    webhookIds,
    qrCode: `https://api.dub.co/qr?url=${link.shortLink}?qr=1`,
    workspaceId: link.projectId ? `ws_${link.projectId}` : null,
  };
};
