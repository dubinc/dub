import useTags from "@/lib/swr/use-tags";
import useWorkspace from "@/lib/swr/use-workspace";
import { LinkWithTagsProps, TagProps } from "@/lib/types";
import TagBadge from "@/ui/links/tag-badge";
import {
  Badge,
  LoadingCircle,
  Magic,
  SimpleTooltipContent,
  Tooltip,
} from "@dub/ui";
import va from "@vercel/analytics";
import { useCompletion } from "ai/react";
import { Command, useCommandState } from "cmdk";
import { Check, ChevronDown, Tag, X } from "lucide-react";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { useDebounce } from "use-debounce";

export default function TagsSection({
  data,
  setData,
}: {
  data: LinkWithTagsProps;
  setData: Dispatch<SetStateAction<LinkWithTagsProps>>;
}) {
  const { tags: availableTags } = useTags();
  const { id: linkId, url, title, description, tags } = data;

  const [inputValue, setInputValue] = useState("");

  const {
    id: workspaceId,
    exceededAI,
    mutate: mutateWorkspace,
  } = useWorkspace();

  const [suggestedTags, setSuggestedTags] = useState<TagProps[]>([]);
  const tagMatch = availableTags
    ?.map(({ name }) => name)
    .includes(inputValue.trim());

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

  const [debouncedUrl] = useDebounce(url, 500);

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
        `From the list of avaialble tags below, suggest relevant tags for this link: 
        
        - URL: ${debouncedUrl}
        - Meta title: ${title}
        - Meta description: ${description}. 
        
        Only return the tag names in comma-separated format, and nothing else. If there are no relevant tags, return an empty string.
        
        Available tags: ${availableTags.map(({ name }) => name).join(", ")}`,
      );
    }
  }, [debouncedUrl, title, description]);

  const [creatingTag, setCreatingTag] = useState(false);

  const createTag = async (tag: string) => {
    setCreatingTag(true);
    setInputValue("");
    fetch(`/api/tags?workspaceId=${workspaceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tag }),
    }).then(async (res) => {
      if (res.ok) {
        await mutate(`/api/tags?workspaceId=${workspaceId}`);
        const newTag = await res.json();
        setData({ ...data, tags: [...tags, newTag] });
        toast.success(`Successfully created tag!`);
        setCreatingTag(false);
      } else {
        const { error } = await res.json();
        toast.error(error.message);
      }
    });
  };

  const commandRef = useRef<HTMLDivElement | null>(null);
  const [openCommandList, setOpenCommandList] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (commandRef.current && !commandRef.current.contains(e.target)) {
        setOpenCommandList(false);
      }
    };
    if (openCommandList) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [commandRef, openCommandList]);

  const CommandInput = () => {
    const isEmpty = useCommandState((state) => state.filtered.count === 0);
    return (
      <Command.Input
        placeholder="Select tags..."
        // hack to focus on the input when the dropdown opens
        autoFocus={openCommandList}
        // when focus on the input. only show the dropdown if there are tags and the tagValue is not empty
        onFocus={() => setOpenCommandList(true)}
        value={inputValue}
        onValueChange={setInputValue}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpenCommandList(false);

            // listen for cases where empty results and enter is pressed
          } else if (e.key === "Enter" && isEmpty) {
            setOpenCommandList(false);
            createTag(inputValue);

            // remove the last tag if backspaced
          } else if (
            ["Backspace", "Delete"].includes(e.key) &&
            inputValue === ""
          ) {
            setData((data) => {
              const popped = [...data.tags];
              popped.pop();
              return { ...data, tags: popped };
            });

            // if it's a letter or a number and there's no meta key pressed, openCommandList dropdown
          } else if (e.key.match(/^[a-z0-9]$/i) && !e.metaKey) {
            setOpenCommandList(true);
          }
        }}
        className="block grow rounded-md border-none px-0 py-1 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 sm:text-sm"
      />
    );
  };

  return (
    <div className="border-b border-gray-200 pb-2">
      <Command
        ref={commandRef}
        className="relative"
        loop
        filter={(value, search) => (value.includes(search.trim()) ? 1 : 0)}
      >
        <div className="group rounded-md border border-gray-300 bg-white p-1 focus-within:border-gray-500 focus-within:ring-1 focus-within:ring-gray-500">
          <div className="absolute inset-y-0 left-0 flex items-center justify-center pl-3 text-gray-400">
            {creatingTag ? (
              <LoadingCircle />
            ) : (
              <Tooltip
                content={
                  <SimpleTooltipContent
                    title={`Tags are used to organize your links in your ${process.env.NEXT_PUBLIC_APP_NAME} dashboard.`}
                    cta="Learn more about tags."
                    href="https://dub.co/help/article/how-to-use-tags"
                  />
                }
              >
                <Tag className="h-4 w-4" />
              </Tooltip>
            )}
          </div>
          <div className="flex flex-wrap space-x-1.5 px-8">
            {tags.map((tag) => (
              <TagBadge key={tag.id} {...tag} />
            ))}
            <CommandInput />
            {tags.length ? (
              <button
                type="button"
                onClick={() => {
                  setData({ ...data, tags: [] });
                  setInputValue("");
                }}
                className="absolute inset-y-0 right-0 my-auto text-gray-400 hover:text-gray-500"
              >
                <X className="h-7 w-7 pr-3" />
              </button>
            ) : (
              <ChevronDown className="absolute inset-y-0 right-0 my-auto h-7 w-7 pr-3 text-gray-400 transition-all" />
            )}
          </div>
        </div>
        {openCommandList && (
          <Command.List className="absolute z-20 mt-2 h-[calc(var(--cmdk-list-height)+17px)] max-h-[300px] w-full overflow-auto rounded-md border border-gray-200 bg-white p-2 shadow-md transition-all">
            {availableTags?.length === 0 && inputValue.length === 0 && (
              <p className="px-4 py-2.5 text-sm text-gray-900">
                Start typing to create tag...
              </p>
            )}
            <Command.Empty>
              {inputValue.length > 0 && (
                <button
                  type="button"
                  onClick={() => createTag(inputValue)}
                  className="flex w-full cursor-pointer items-center rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-900 hover:text-gray-900 aria-selected:bg-gray-100 aria-selected:text-gray-900"
                >
                  Create tag{" "}
                  <span className="ml-1.5 rounded-md bg-gray-200 px-2 py-0.5 text-gray-800">
                    {inputValue}
                  </span>
                </button>
              )}
            </Command.Empty>
            {availableTags?.map((tag) => (
              <Command.Item
                key={tag.id}
                value={tag.name}
                onSelect={() => {
                  const isRemoving = data.tags
                    .map(({ id }) => id)
                    .includes(tag.id);
                  setData({
                    ...data,
                    tags: isRemoving
                      ? data.tags.filter(({ id }) => id !== tag.id)
                      : [...data.tags, tag],
                  });
                  setInputValue("");
                }}
                className="group flex cursor-pointer items-center justify-between rounded-md px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200 aria-selected:bg-gray-100 aria-selected:text-gray-900"
              >
                <TagBadge {...tag} />
                {tags.map(({ id }) => id).includes(tag.id) && (
                  <Check className="h-5 w-5 text-gray-500" />
                )}
              </Command.Item>
            ))}

            {inputValue.length > 0 && !tagMatch && (
              <Command.Item
                key="create-tag"
                value={inputValue}
                onSelect={(tag) => createTag(tag)}
                className="group flex cursor-pointer items-center justify-between rounded-md px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200 aria-selected:bg-gray-100 aria-selected:text-gray-900"
              >
                <div className="flex items-center">
                  Create tag{" "}
                  <span className="ml-1.5 rounded-md bg-gray-200 px-2 py-0.5 text-gray-800">
                    {inputValue}
                  </span>
                </div>
              </Command.Item>
            )}
          </Command.List>
        )}
      </Command>
      <div className="flex min-h-[40px] flex-wrap items-center gap-x-2 gap-y-1 py-2">
        {suggestedTags.length > 0 && (
          <>
            <Tooltip content="AI-suggested tags based on the content of the link. Click to add.">
              <div className="group">
                <Magic className="h-4 w-4 transition-colors group-hover:text-gray-500" />
              </div>
            </Tooltip>
            {suggestedTags.map((tag) => (
              <button
                type="button"
                key={tag.id}
                onClick={() => {
                  setData({
                    ...data,
                    tags: [...tags, tag],
                  });
                  setSuggestedTags((tags) =>
                    tags.filter(({ id }) => id !== tag.id),
                  );
                  va.track("Selected AI-suggested tag", {
                    metadata: `Tag: ${tag.name} | URL: ${url}`,
                  });
                }}
                className="group flex items-center transition-all active:scale-95"
              >
                <Badge
                  variant="neutral"
                  className="transition-colors group-hover:border-gray-700 group-hover:text-gray-700"
                >
                  {tag.name}
                </Badge>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
