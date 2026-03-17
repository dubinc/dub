import { PartnerBountyProps } from "@/lib/types";
import { Markdown } from "@/ui/shared/markdown";
import { PROSE_STYLES } from "@dub/ui";
import { cn } from "@dub/utils";

export function BountyDescription({ bounty }: { bounty: PartnerBountyProps }) {
  const description = bounty.description?.trim();

  if (!description) {
    return null;
  }

  return (
    <div>
      <h3 className="text-content-emphasis text-lg font-semibold">
        Bounty details
      </h3>

      <div className="flex flex-col gap-1">
        <Markdown
          className={cn(
            PROSE_STYLES.default,
            "text-content-subtle text-sm font-normal",
          )}
        >
          {description}
        </Markdown>
      </div>
    </div>
  );
}
