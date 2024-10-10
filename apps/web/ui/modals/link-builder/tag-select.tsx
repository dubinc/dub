import useTags from "@/lib/swr/use-tags";
import useTagsCount from "@/lib/swr/use-tags-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { TagProps } from "@/lib/types";
import { TAGS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/tags";
import TagBadge from "@/ui/links/tag-badge";
import {
  AnimatedSizeContainer,
  Combobox,
  InfoTooltip,
  Magic,
  SimpleTooltipContent,
  Tooltip,
  useKeyboardShortcut,
} from "@dub/ui";
import { Tag } from "@dub/ui/src";
import { cn } from "@dub/utils";
import { useCompletion } from "ai/react";
import posthog from "posthog-js";
import { useContext, useEffect, useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import { useDebounce } from "use-debounce";
import { LinkFormData, LinkModalContext } from ".";
import { MultiTagsIcon } from "./multi-tags-icon";

function getTagOption(tag: TagProps) {
  return {
    value: tag.id,
    label: tag.name,
    icon: <MultiTagsIcon tags={[tag]} />,
    meta: { color: tag.color },
  };
}

export function TagSelect() {
  const { mutate: mutateWorkspace, exceededAI } = useWorkspace();
  const { workspaceId } = useContext(LinkModalContext);

  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const { data: tagsCount } = useTagsCount();
  const useAsync = tagsCount && tagsCount > TAGS_MAX_PAGE_SIZE;

  const { tags: availableTags, loading: loadingTags } = useTags({
    query: useAsync ? { search: debouncedSearch } : undefined,
  });

  const { watch, setValue } = useFormContext<LinkFormData>();
  const [tags, linkId, url, title, description] = watch([
    "tags",
    "id",
    "url",
    "title",
    "description",
  ]);
  const [debouncedUrl] = useDebounce(url, 500);

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
    () => availableTags?.map((tag) => getTagOption(tag)),
    [availableTags],
  );

  const selectedTags = useMemo(
    () => tags.map((tag) => getTagOption(tag)),
    [tags],
  );

  useKeyboardShortcut("t", () => setIsOpen(true), { modal: true });

  const [suggestedTags, setSuggestedTags] = useState<TagProps[]>([]);

  const { complete } = useCompletion({
    api: `/api/ai/completion?workspaceId=${workspaceId}`,
    body: {
      model: "claude-3-haiku-20240307",
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onFinish: (_, completion) => {
      mutateWorkspace();
      if (completion) {
        const completionArr = completion.split(", ");
        const suggestedTags = completionArr
          .map((tag: string) => {
            return availableTags?.find(({ name }) => name === tag) || null;
          })
          .filter(Boolean);
        setSuggestedTags(suggestedTags as TagProps[]);
      }
    },
  });

  useEffect(() => {
    if (
      !linkId &&
      debouncedUrl &&
      title &&
      description &&
      !exceededAI &&
      tags.length === 0 &&
      suggestedTags.length === 0 &&
      availableTags &&
      availableTags.length > 0
    ) {
      complete(
        `From the list of available tags below, suggest relevant tags for this link: 
        
        - URL: ${debouncedUrl}
        - Meta title: ${title}
        - Meta description: ${description}. 
        
        Only return the tag names in comma-separated format, and nothing else. If there are no relevant tags, return an empty string.
        
        Available tags: ${availableTags.map(({ name }) => name).join(", ")}`,
      );
    }
  }, [linkId, debouncedUrl, title, description, tags]);

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
        setSelected={(newTags) => {
          const selectedIds = newTags.map(({ value }) => value);
          setValue(
            "tags",
            selectedIds.map((id) =>
              [...(availableTags || []), ...(tags || [])]?.find(
                (t) => t.id === id,
              ),
            ),
            { shouldDirty: true },
          );
        }}
        options={loadingTags ? undefined : options}
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
        onSearchChange={setSearch}
        shouldFilter={!useAsync}
        matchTriggerWidth
      >
        {selectedTags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedTags.slice(0, 10).map((tag) => (
              <TagBadge
                key={tag.value}
                name={tag.label}
                color={tag.meta.color}
                className="animate-fade-in"
              />
            ))}
          </div>
        ) : loadingTags && availableTags === undefined && tags.length ? (
          <div className="my-px h-6 w-1/4 animate-pulse rounded bg-gray-200" />
        ) : (
          <span className="my-px block py-0.5">Select tags...</span>
        )}
      </Combobox>
      <AnimatedSizeContainer
        height
        transition={{ ease: "linear", duration: 0.1 }}
      >
        {suggestedTags.length > 0 && (
          <div className="animate-fade-in flex flex-wrap items-center gap-2 pt-3">
            <Tooltip content="AI-suggested tags based on the content of the link. Click a suggested tag to add it.">
              <div className="group">
                <Magic className="size-4 text-gray-600 transition-colors group-hover:text-gray-500" />
              </div>
            </Tooltip>
            {suggestedTags.map((tag) => (
              <button
                type="button"
                key={tag.id}
                onClick={() => {
                  setValue("tags", [...tags, tag], { shouldDirty: true });
                  setSuggestedTags((tags) =>
                    tags.filter(({ id }) => id !== tag.id),
                  );
                  posthog.capture("ai_suggested_tag_selected", {
                    tag: tag.name,
                    url: url,
                  });
                }}
                className="group flex items-center transition-all active:scale-95"
              >
                <TagBadge {...tag} />
              </button>
            ))}
          </div>
        )}
      </AnimatedSizeContainer>
    </div>
  );
}
