import { Link, Tag, Webhook } from "@prisma/client";

export type LinkWithTags = Link & {
  tags?: { tag: Pick<Tag, "id" | "name" | "color"> }[];
  webhooks?: { webhook: Pick<Webhook, "id" | "name" | "url"> }[];
};

// Transform link with additional properties
export const transformLink = (link: LinkWithTags) => {
  const tags = (link.tags || []).map(({ tag }) => tag);
  const webhooks = (link.webhooks || []).map(({ webhook }) => webhook);

  return {
    ...link,
    tagId: tags?.[0]?.id ?? null, // backwards compatibility
    tags,
    webhooks,
    qrCode: `https://api.dub.co/qr?url=${link.shortLink}?qr=1`,
    workspaceId: link.projectId ? `ws_${link.projectId}` : null,
  };
};
