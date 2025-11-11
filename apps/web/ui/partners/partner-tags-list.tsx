import { PartnerTagProps } from "@/lib/types";
import { Tooltip, TruncatedList, useRouterStuff } from "@dub/ui";
import { cn } from "@dub/utils";

const tagPillClassName =
  "bg-bg-inverted/5 text-content-default select-none flex h-6 items-center rounded-md px-2 text-xs font-semibold hover:bg-bg-inverted/10";

export function PartnerTagsList({ tags }: { tags?: PartnerTagProps[] }) {
  return tags?.length ? (
    <TruncatedList
      className="flex items-center gap-2"
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
    "-"
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
