import {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Check, ChevronDown, Tag, X } from "lucide-react";
import { Command, useCommandState } from "cmdk";
import TagBadge from "@/components/app/links/tag-badge";
import { type Link as LinkProps } from "@prisma/client";
import useTags from "#/lib/swr/use-tags";
import { useRouter } from "next/router";
import { toast } from "sonner";
import { mutate } from "swr";
import { LoadingCircle } from "#/ui/icons";
import Tooltip, { SimpleTooltipContent } from "#/ui/tooltip";
import { HOME_DOMAIN } from "#/lib/constants";

export default function TagsSection({
  data,
  setData,
}: {
  data: LinkProps;
  setData: Dispatch<SetStateAction<LinkProps>>;
}) {
  const router = useRouter();
  const { slug } = router.query;
  const { tagId } = data;
  const { tags } = useTags();

  const selectedTag = useMemo(() => {
    if (tagId) {
      return tags?.find((tag) => tag.id === tagId);
    }
  }, [tagId, tags]);

  const [inputValue, setInputValue] = useState("");
  const [creatingTag, setCreatingTag] = useState(false);

  const createTag = async (tag: string) => {
    setCreatingTag(true);
    fetch(`/api/projects/${slug}/tags`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tag }),
    }).then(async (res) => {
      if (res.ok) {
        mutate(`/api/projects/${slug}/tags`);
        const newTag = await res.json();
        setData({ ...data, tagId: newTag.id });
        toast.success(`Successfully created tag!`);
        setCreatingTag(false);
      } else {
        const error = await res.text();
        toast.error(error);
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
        placeholder="Choose a tag"
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
            // if it's a letter or a number and there's no meta key pressed, openCommandList dropdown
          } else if (e.key.match(/^[a-z0-9]$/i) && !e.metaKey) {
            setOpenCommandList(true);
          }
        }}
        className="block w-full rounded-md border-none px-0 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 sm:text-sm"
      />
    );
  };

  return (
    <div className="border-b border-gray-200 pb-5">
      <Command ref={commandRef} className="relative" loop>
        <div className="group mt-1 rounded-md border border-gray-300 bg-white px-1 focus-within:border-gray-500 focus-within:ring-1 focus-within:ring-gray-500">
          <div className="absolute inset-y-0 left-0 flex items-center justify-center pl-3 text-gray-400">
            {creatingTag ? (
              <LoadingCircle />
            ) : (
              <Tooltip
                content={
                  <SimpleTooltipContent
                    title="Tags are used to organize your links in your Dub dashboard."
                    cta="Learn more about tags."
                    href={`${HOME_DOMAIN}/help/article/how-to-use-tags`}
                  />
                }
              >
                <Tag className="h-4 w-4" />
              </Tooltip>
            )}
          </div>
          <div className="flex h-9 px-8">
            {selectedTag ? (
              <TagBadge key={selectedTag.id} {...selectedTag} />
            ) : (
              <CommandInput />
            )}
            {selectedTag ? (
              <button
                onClick={() => {
                  setData({ ...data, tagId: null });
                  setInputValue("");
                }}
                className="absolute inset-y-0 right-0 my-auto"
              >
                <X className="h-7 w-7 pr-3 text-gray-400" />
              </button>
            ) : (
              <ChevronDown className="absolute inset-y-0 right-0 my-auto h-7 w-7 pr-3 text-gray-400 transition-all" />
            )}
          </div>
        </div>
        {openCommandList && (
          <Command.List
            style={{
              animationFillMode: "forwards", // to keep the last frame of the animation
            }}
            className="absolute z-20 h-[300px] w-full animate-input-select-slide-up overflow-auto rounded-md border border-gray-200 bg-white p-2 shadow-md transition-all sm:h-[calc(var(--cmdk-list-height)+17px)] sm:max-h-[300px] sm:animate-input-select-slide-down"
          >
            {tags?.length === 0 && inputValue.length === 0 && (
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
            {tags?.map((tag) => (
              <Command.Item
                key={tag.id}
                value={tag.name}
                onSelect={() => {
                  setData({ ...data, tagId: tag.id });
                  setOpenCommandList(false);
                }}
                className="group flex cursor-pointer items-center justify-between rounded-md px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200 aria-selected:bg-gray-100 aria-selected:text-gray-900"
              >
                <TagBadge {...tag} />
                {selectedTag?.id === tag.id && (
                  <Check className="h-5 w-5 text-gray-500" />
                )}
              </Command.Item>
            ))}
          </Command.List>
        )}
      </Command>
    </div>
  );
}
