import useTags from "@/lib/swr/use-tags";
import TagBadge from "@/ui/links/tag-badge";
import {
  Combobox,
  InfoTooltip,
  SimpleTooltipContent,
  useKeyboardShortcut,
} from "@dub/ui";
import { Tag } from "@dub/ui/src";
import { cn } from "@dub/utils";
import { useContext, useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import { LinkFormData, LinkModalContext } from ".";
import { MultiTagsIcon } from "./multi-tags-icon";

export function TagSelect() {
  const { workspaceId } = useContext(LinkModalContext);
  const { tags: availableTags } = useTags();

  const { watch, setValue } = useFormContext<LinkFormData>();
  const tags = watch("tags");

  const [isOpen, setIsOpen] = useState(false);

  const createTag = async (tag: string) => {
    const res = await fetch(`/api/tags?workspaceId=${workspaceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tag }),
    });

    if (res.ok) {
      const newTag = await res.json();
      setValue("tags", [...tags, newTag]);
      toast.success(`Successfully created tag!`);
      setIsOpen(false);
      await mutate(`/api/tags?workspaceId=${workspaceId}`);
      return true;
    } else {
      const { error } = await res.json();
      toast.error(error.message);
    }

    return false;
  };

  const options = useMemo(
    () =>
      availableTags?.map((tag) => ({
        label: tag.name,
        value: tag.id,
        icon: <MultiTagsIcon tags={[tag]} />,
        meta: {
          color: tag.color,
        },
      })),
    [availableTags],
  );

  const selectedTags = useMemo(
    () =>
      tags
        .map(({ id }) => options?.find(({ value }) => value === id)!)
        .filter(Boolean),
    [tags, options],
  );

  useKeyboardShortcut("t", () => setIsOpen(true), { modal: true });

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <label
          htmlFor="comments"
          className="block text-sm font-medium text-gray-700"
        >
          Tags
        </label>
        <InfoTooltip
          content={
            <SimpleTooltipContent
              title={`Tags are used to organize your links in your ${process.env.NEXT_PUBLIC_APP_NAME} dashboard.`}
              cta="Learn more."
              href="https://dub.co/help/article/how-to-use-tags"
            />
          }
        />
      </div>
      <Combobox
        multiple
        selected={selectedTags}
        setSelected={(tags) => {
          const selectedIds = tags.map(({ value }) => value);
          setValue(
            "tags",
            selectedIds.map((id) => availableTags?.find((t) => t.id === id)),
            { shouldDirty: true },
          );
        }}
        options={options}
        icon={<Tag className="mt-[5px] size-4 text-gray-500" />}
        searchPlaceholder="Search or add tags..."
        shortcutHint="T"
        buttonProps={{
          className: cn(
            "h-auto py-1.5 px-2.5 w-full text-gray-700 border-gray-300 items-start",
            selectedTags.length === 0 && "text-gray-400",
          ),
        }}
        onCreate={(search) => createTag(search)}
        open={isOpen}
        onOpenChange={setIsOpen}
        matchTriggerWidth
      >
        {selectedTags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedTags.slice(0, 10).map((tag) => (
              <TagBadge
                key={tag.value}
                name={tag.label}
                color={tag.meta.color}
              />
            ))}
          </div>
        ) : (
          <span className="my-px block py-0.5">Select tags...</span>
        )}
      </Combobox>
    </div>
  );
}
