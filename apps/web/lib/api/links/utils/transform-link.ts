import { linkConstructor } from "@dub/utils";
import { Link, Tag } from "@prisma/client";

export type LinkWithTags = Link & {
  tags?: { tag: Pick<Tag, "id" | "name" | "color"> }[];
};

// Transform link with additional properties
export const transformLink = (link: LinkWithTags) => {
  const tags = (link.tags || []).map(({ tag }) => tag);

  const shortLink = linkConstructor({
    domain: link.domain,
    key: link.key,
  });

  const qrLink = linkConstructor({
    domain: link.domain,
    key: link.key,
    searchParams: {
      qr: "1",
    },
  });

  return {
    ...link,
    shortLink,
    tagId: tags?.[0]?.id ?? null, // backwards compatibility
    tags,
    qrCode: `https://api.dub.co/qr?url=${qrLink}`,
    workspaceId: link.projectId ? `ws_${link.projectId}` : null,
  };
};
