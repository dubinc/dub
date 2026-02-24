import useWorkspace from "@/lib/swr/use-workspace";
import { PartnerTagProps } from "@/lib/types";
import { Tag, Tooltip, TruncatedList, useRouterStuff } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";

const tagPillClassName =
  "bg-bg-inverted/5 text-content-default whitespace-nowrap min-w-0 select-none flex h-6 items-center rounded-md px-2 text-xs font-semibold hover:bg-bg-inverted/10";

export function PartnerTagsList({
  tags,
  compact,
  wrap,
  onAddTag,
  mode = "filter",
}: {
  tags?: PartnerTagProps[];
  compact?: boolean;
  wrap?: boolean;
  onAddTag: () => void;
  mode?: "filter" | "link";
}) {
  return tags?.length ? (
    <TruncatedList
      className={cn("flex items-center gap-2", wrap && "flex-wrap")}
      overflowIndicator={({ visible, hidden }) => (
        <Tooltip
          content={
            <div className="flex max-w-sm flex-wrap gap-1 p-2">
              {tags.slice(visible).map((tag) => (
                <TagButton key={tag.id} {...tag} mode={mode} />
              ))}
            </div>
          }
        >
          <div className={cn(tagPillClassName, "cursor-default")}>
            +{hidden}
          </div>
        </Tooltip>
      )}
    >
      {tags.map((tag) => (
        <TagButton key={tag.id} {...tag} mode={mode} />
      ))}
    </TruncatedList>
  ) : (
    <button
      type="button"
      onClick={() => onAddTag()}
      className={cn(
        tagPillClassName,
        "group/add-tag active:bg-bg-inverted/15 w-fit px-1.5 font-medium",
      )}
    >
      <Tag className="size-3.5" />
      <div
        className={cn(
          "overflow-hidden",
          compact &&
            "grid grid-cols-[0fr] transition-[grid-template-columns] group-hover/add-tag:grid-cols-[1fr]",
        )}
      >
        <div
          className={cn(
            "min-w-0",
            compact &&
              "opacity-0 transition-opacity group-hover/add-tag:opacity-100",
          )}
        >
          <span className="pl-1 pr-0.5">Add tag</span>
        </div>
      </div>
    </button>
  );
}

function TagButton({
  name,
  id,
  mode,
}: PartnerTagProps & { mode?: "filter" | "link" }) {
  const { slug: workspaceSlug } = useWorkspace();
  const { queryParams } = useRouterStuff();

  return mode === "filter" ? (
    <button
      type="button"
      onClick={() => {
        queryParams({
          set: {
            partnerTagId: id,
          },
        });
      }}
      className={cn(tagPillClassName, "active:bg-bg-inverted/15")}
    >
      <span className="min-w-0 truncate">{name}</span>
    </button>
  ) : (
    <Link
      href={`/${workspaceSlug}/program/partners?partnerTagId=${id}`}
      className={cn(tagPillClassName, "active:bg-bg-inverted/15")}
    >
      <span className="min-w-0 truncate">{name}</span>
    </Link>
  );
}
