import { getUrlObjFromString } from "@dub/utils";
import { GroupProps, PartnerProfileLinkProps } from "../types";

export function constructPartnerLink({
  group,
  link,
}: {
  group?: Pick<GroupProps, "linkStructure"> | null;
  link?: Pick<PartnerProfileLinkProps, "key" | "url" | "shortLink">;
}) {
  if (!link) {
    return "";
  }

  const { linkStructure } = group ?? {};

  const urlObj = link?.url ? getUrlObjFromString(link.url) : null;

  if (linkStructure === "query" && urlObj) {
    return `https://${urlObj.hostname}?via=${link.key}`;
  }

  // if (linkStructure === "path" && urlObj) {
  //   return `https://${urlObj.hostname}/refer/${link.key}`;
  // }

  return link.shortLink;
}
