import { PartnerTagProps } from "@/lib/types";
import { Tag, Tooltip, TruncatedList, useRouterStuff } from "@dub/ui";
import { cn } from "@dub/utils";
import { toast } from "sonner";

const tagPillClassName =
  "bg-bg-inverted/5 text-content-default whitespace-nowrap select-none flex h-6 items-center rounded-md px-2 text-xs font-semibold hover:bg-bg-inverted/10";

export function PartnerTagsList({
  tags,
  wrap,
}: {
  tags?: PartnerTagProps[];
  wrap?: boolean;
}) {
  return tags?.length ? (
    <TruncatedList
      className={cn("flex items-center gap-2", wrap && "flex-wrap")}
      overflowIndicator={({ visible, hidden }) => (
        <Tooltip
          content={
            <div className="flex max-w-sm flex-wrap gap-1 p-2">
              {tags.slice(visible).map((tag) => (
                <TagButton key={tag.id} {...tag} />
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
        <TagButton key={tag.id} {...tag} />
      ))}
    </TruncatedList>
  ) : (
    <button
      type="button"
      onClick={() => toast.info("WIP")}
      className={cn(
        tagPillClassName,
        "group/add-tag active:bg-bg-inverted/15 px-1.5 font-medium",
      )}
    >
      <Tag className="size-3.5" />
      <div className="grid grid-cols-[0fr] overflow-hidden transition-[grid-template-columns] group-hover/add-tag:grid-cols-[1fr]">
        <div className="min-w-0 opacity-0 transition-opacity group-hover/add-tag:opacity-100">
          <span className="pl-1 pr-0.5">Add tag</span>
        </div>
      </div>
    </button>
  );
}

function TagButton({ name, id }: PartnerTagProps) {
  const { queryParams } = useRouterStuff();

  return (
    <button
      type="button"
      onClick={() => {
        queryParams({
          set: {
            tagIds: id,
          },
        });
      }}
      className={cn(tagPillClassName, "active:bg-bg-inverted/15")}
    >
      {name}
    </button>
  );
}
