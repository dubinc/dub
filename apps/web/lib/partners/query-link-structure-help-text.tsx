import { CopyText } from "@dub/ui";
import { getDomainWithoutWWW } from "@dub/utils";
import { ProgramProps } from "../types";

export const QueryLinkStructureHelpText = ({
  program,
  linkKey,
}: {
  program: Pick<
    ProgramProps,
    "domain" | "url" | "linkStructure" | "linkParameter"
  >;
  linkKey: string;
}) => {
  if (!program.url) {
    return null;
  }

  const appendValue = `?${program.linkParameter ?? "via"}=${linkKey}`;
  return (
    <p className="mt-1.5 text-xs text-neutral-500">
      Link to any page on{" "}
      <a
        href={program.url}
        target="_blank"
        rel="noopener noreferrer"
        className="cursor-alias text-neutral-700 decoration-dotted underline-offset-2 hover:underline"
      >
        {getDomainWithoutWWW(program.url)}
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
