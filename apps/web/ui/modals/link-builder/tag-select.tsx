import useTags from "@/lib/swr/use-tags";
import { Combobox, useKeyboardShortcut } from "@dub/ui";
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
      icon={<MultiTagsIcon tags={selectedTags.map(({ meta }) => meta)} />}
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
