import useTags from "@/lib/swr/use-tags";
import { TagProps } from "@/lib/types";
import { COLORS_LIST } from "@/ui/links/tag-badge";
import { Combobox, useKeyboardShortcut } from "@dub/ui";
import { cn } from "@dub/utils";
import { useContext, useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import { LinkFormData, LinkModalContext } from ".";

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
        icon: <TagIcon tags={[tag]} />,
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
      icon={<TagIcon tags={selectedTags.map(({ meta }) => meta)} />}
      side="top"
      placeholder="Tags"
      searchPlaceholder="Search or add tags..."
      shortcutHint="T"
      buttonProps={{
        className:
          "h-9 px-2.5 w-fit font-medium text-gray-700 max-w-48 min-w-0",
      }}
      onCreate={(search) => createTag(search)}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      {selectedTags.length > 0
        ? selectedTags.length === 1
          ? selectedTags[0].label
          : `${selectedTags.length} Tags`
        : "Tags"}
    </Combobox>
  );
}

function TagIcon({ tags }: { tags: Pick<TagProps, "color">[] }) {
  return (
    <svg
      height="18"
      width="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        "size-4 shrink-0",
        tags.length > 0 &&
          COLORS_LIST.find(({ color }) => color === tags[0].color)?.css,
        "bg-transparent",
        tags.length <= 1 && "-translate-y-px",
      )}
    >
      <g fill="currentColor">
        {tags.length > 0 && (
          <path
            d="M1.75 4.25H7.336C7.601 4.25 7.856 4.355 8.043 4.543L13.836 10.336C14.617 11.117 14.617 12.383 13.836 13.164L10.664 16.336C9.883 17.117 8.617 17.117 7.836 16.336L2.043 10.543C1.855 10.355 1.75 10.101 1.75 9.836V4.25Z"
            fill="currentColor"
            fillOpacity={0.15}
            stroke="none"
          />
        )}
        <path
          d="M1.75 4.25H7.336C7.601 4.25 7.856 4.355 8.043 4.543L13.836 10.336C14.617 11.117 14.617 12.383 13.836 13.164L10.664 16.336C9.883 17.117 8.617 17.117 7.836 16.336L2.043 10.543C1.855 10.355 1.75 10.101 1.75 9.836V4.25Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />

        {tags.length > 1 && (
          <path
            d="M3.25 1.75V1.25H8.836C9.101 1.25 9.356 1.355 9.543 1.543L15.336 7.336C15.768 7.768 15.961 8.348 15.915 8.913"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            className={cn(
              COLORS_LIST.find(({ color }) => color === tags[1].color)?.css,
              "bg-transparent",
            )}
          />
        )}
        <path
          d="M5.25 9C5.94036 9 6.5 8.44036 6.5 7.75C6.5 7.05964 5.94036 6.5 5.25 6.5C4.55964 6.5 4 7.05964 4 7.75C4 8.44036 4.55964 9 5.25 9Z"
          fill="currentColor"
          stroke="none"
        />
      </g>
    </svg>
  );
}
