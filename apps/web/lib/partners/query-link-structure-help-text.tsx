import { CopyText } from "@dub/ui";
import { getDomainWithoutWWW } from "@dub/utils";
import { PartnerProfileLinkProps } from "../types";

export const QueryLinkStructureHelpText = ({
  link,
}: {
  link?: Pick<PartnerProfileLinkProps, "key" | "url" | "shortLink">;
}) => {
  if (!link) {
    return null;
  }

  const appendValue = `?via=${link.key}`;
  return (
    <p className="mt-1.5 text-xs text-neutral-500">
      Link to any page on{" "}
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="cursor-alias text-neutral-700 decoration-dotted underline-offset-2 hover:underline"
      >
        {getDomainWithoutWWW(link.url)}
      </a>{" "}
      by adding{" "}
      <CopyText
        value={appendValue}
        className="font-mono text-xs text-neutral-700"
      >
        {appendValue}
      </CopyText>{" "}
      to the URL.
    </p>
  );
};
