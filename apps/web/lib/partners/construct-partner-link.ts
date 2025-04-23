import { ProgramProps } from "../types";

export function constructPartnerLink({
  program,
  linkKey,
}: {
  program: Pick<
    ProgramProps,
    "domain" | "url" | "linkStructure" | "linkParameter"
  >;
  linkKey: string;
}) {
  const { domain, url, linkStructure, linkParameter } = program;

  if (linkStructure === "query") {
    return `${url}?${linkParameter ?? "via"}=${linkKey}`;
  }

  if (linkStructure === "path") {
    return `${url}/${linkParameter ?? "refer"}/${linkKey}`;
  }

  return `https://${domain}/${linkKey}`;
}
