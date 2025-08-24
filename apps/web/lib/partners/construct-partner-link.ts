import { getUrlObjFromString } from "@dub/utils";
import { ProgramProps } from "../types";

export function constructPartnerLink({
  program,
  linkKey = "",
}: {
  program?: Pick<
    ProgramProps,
    "domain" | "url" | "linkStructure" | "linkParameter"
  >;
  linkKey?: string;
}) {
  if (!program) {
    return "";
  }

  const { domain, url, linkStructure, linkParameter } = program;

  const urlObj = url ? getUrlObjFromString(url) : null;

  if (linkStructure === "query" && urlObj) {
    return `https://${urlObj.hostname}?${linkParameter ?? "via"}=${linkKey}`;
  }

  if (linkStructure === "path" && urlObj) {
    return `https://${urlObj.hostname}/${linkParameter ?? "refer"}/${linkKey}`;
  }

  return `https://${domain}/${linkKey}`;
}
