import { getUrlObjFromString } from "@dub/utils";
import { GroupProps, ProgramProps } from "../types";

export function constructPartnerLink({
  program,
  group,
  linkKey = "",
}: {
  program?: Pick<ProgramProps, "domain" | "url" | "linkParameter">;
  group?: Pick<GroupProps, "linkStructure"> | null;
  linkKey?: string;
}) {
  if (!program || !group) {
    return "";
  }

  const { domain, url, linkParameter } = program;
  const { linkStructure } = group;

  const urlObj = url ? getUrlObjFromString(url) : null;

  if (linkStructure === "query" && urlObj) {
    return `https://${urlObj.hostname}?${linkParameter ?? "via"}=${linkKey}`;
  }

  if (linkStructure === "path" && urlObj) {
    return `https://${urlObj.hostname}/${linkParameter ?? "refer"}/${linkKey}`;
  }

  return `https://${domain}/${linkKey}`;
}
