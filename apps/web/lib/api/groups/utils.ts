import { DefaultPartnerLink } from "@/lib/types";

export interface DefaultLinksDiff {
  added: DefaultPartnerLink | null;
  updated: { old: DefaultPartnerLink; new: DefaultPartnerLink } | null;
}

// Identifies the added and updated default links in a group
export function diffDefaultPartnerLink(
  oldLinks: DefaultPartnerLink[],
  newLinks: DefaultPartnerLink[],
): DefaultLinksDiff {
  let added: DefaultPartnerLink | null = null;

  let updated: {
    old: DefaultPartnerLink;
    new: DefaultPartnerLink;
  } | null = null;

  const oldMap = new Map((oldLinks || []).map((link) => [link.id, link]));

  for (const link of newLinks) {
    const old = oldMap.get(link.id);

    if (!old) {
      // new link added
      added = link;
    } else if (old.domain !== link.domain || old.url !== link.url) {
      // existing link updated
      updated = { old, new: link };
    }
  }

  return {
    added,
    updated,
  };
}
