import { PartnerBountyProps } from "@/lib/types";
import { Markdown } from "@/ui/shared/markdown";
import { PROSE_STYLES } from "@dub/ui";
import { cn } from "@dub/utils";

export function BountyDescription({
  bounty,
  embed,
}: {
  bounty: PartnerBountyProps;
  embed?: boolean;
}) {
  const description = bounty.description?.trim();

  if (!description) {
    return null;
  }

  return (
    <div>
      <h3 className="text-content-emphasis text-sm font-semibold">
        Bounty details
      </h3>

      <div className="flex flex-col gap-1">
        <Markdown
          className={cn(
            PROSE_STYLES.default,
            "text-content-subtle text-sm font-normal",
            embed && "dark:prose-invert dark:prose-a:text-neutral-100",
          )}
        >
          {description}
        </Markdown>
      </div>
    </div>
  );
}
