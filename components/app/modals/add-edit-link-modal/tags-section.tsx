import {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Check, Search, Trash, X } from "lucide-react";
import { Command } from "cmdk";
import TagBadge, { COLORS_LIST } from "../../links/tag-badge";
import { LinkProps, TagProps } from "#/lib/types";
import useTags from "#/lib/swr/use-tags";
import { useRouter } from "next/router";
import { toast } from "sonner";
import { mutate } from "swr";
import { LoadingCircle } from "#/ui/icons";
import Popover from "@/components/shared/popover";
import IconMenu from "@/components/shared/icon-menu";
import { ChevronDown, ThreeDots } from "@/components/shared/icons";

export default function TagsSection({
  data,
  setData,
}: {
  data: LinkProps;
  setData: Dispatch<SetStateAction<LinkProps>>;
}) {
  const { tagId } = data;
  const { tags } = useTags();

  const selectedTag = useMemo(() => {
    if (tagId) {
      return tags?.find((tag) => tag.id === tagId);
    }
  }, [tagId, tags]);

  const [inputValue, setInputValue] = useState("");

  const [creatingTag, setCreatingTag] = useState(false);

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

  return (
    <div className="border-b border-gray-200 pb-5">
      <Command ref={commandRef} className="relative" loop>
        <div className="group mt-1 rounded-md border border-gray-300 bg-white px-1 focus-within:border-gray-500 focus-within:ring-1 focus-within:ring-gray-500">
          <div className="absolute inset-y-0 left-0 flex items-center justify-center pl-3 text-gray-400">
            {creatingTag ? <LoadingCircle /> : <Search className="h-4 w-4" />}
          </div>
          <div className="flex h-9 px-8">
            {selectedTag ? (
              <TagBadge key={selectedTag.id} {...selectedTag} />
            ) : (
              <Command.Input
                placeholder="Choose a tag"
                value={inputValue}
                onValueChange={setInputValue}
                // only show the dropdown if there are tags and the tagValue is not empty
                onFocus={() =>
                  tags && tags.length > 0 && setOpenCommandList(true)
                }
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.stopPropagation();
                    setOpenCommandList(false);
                  } else if (e.key === "Enter") {
                    if (openCommandList) {
                      // if dropdown is openCommandList, close it
                      setOpenCommandList(false);
                    } else {
                      // if dropdown is already closed, submit form
                    }
                    // if it's a letter or a number and there's no meta key pressed, openCommandList dropdown
                  } else if (e.key.match(/^[a-z0-9]$/i) && !e.metaKey) {
                    setOpenCommandList(true);
                  }
                }}
                className="block w-full rounded-md border-none px-0 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0"
              />
            )}
            {selectedTag ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setData({ ...data, tagId: null });
                  setOpenCommandList(true);
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
            className="absolute z-20 h-[300px] w-full animate-input-select-slide-up overflow-auto rounded-md border border-gray-200 bg-white p-2 shadow-md transition-all sm:h-auto sm:max-h-[300px] sm:animate-input-select-slide-down"
          >
            <Command.Empty>
              <button
                type="button"
                onClick={() => setOpenCommandList(false)}
                className="flex w-full cursor-pointer items-center rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-900 hover:text-gray-900 aria-selected:bg-gray-100 aria-selected:text-gray-900"
              >
                {inputValue.length > 0 ? (
                  <>
                    Create tag{" "}
                    <span className="ml-1.5 rounded-md bg-blue-100 px-2 py-0.5 text-blue-600">
                      {inputValue}
                    </span>
                  </>
                ) : (
                  <p className="py-0.5">Start typing to create tag...</p>
                )}
              </button>
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

const TagPopover = ({ tag }: { tag: TagProps }) => {
  const router = useRouter();
  const { slug } = router.query as { slug: string };
  const [data, setData] = useState(tag);
  const [openPopover, setOpenPopover] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleEdit = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    setProcessing(true);
    fetch(`/api/projects/${slug}/tags/${tag.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }).then((res) => {
      setProcessing(false);
      if (res.ok) {
        toast.success("Tag updated");
        mutate(`/api/projects/${slug}/tags`);
      } else {
        toast.error("Something went wrong");
      }
    });
  };

  const handleDelete = async () => {
    setProcessing(true);
    fetch(`/api/projects/${slug}/tags/${tag.id}`, {
      method: "DELETE",
    }).then((res) => {
      setProcessing(false);
      if (res.ok) {
        toast.success("Tag deleted");
        mutate(`/api/projects/${slug}/tags`);
      } else {
        toast.error("Something went wrong");
      }
    });
  };

  return processing ? (
    <LoadingCircle />
  ) : (
    <Popover
      content={
        <div className="flex w-48 flex-col divide-y divide-gray-200">
          <div className="p-2">
            <form
              onClick={(e) => e.stopPropagation()} // prevent triggering <Command.Item> onClick
              onKeyDown={(e) => e.stopPropagation()} // prevent triggering <Command.Item> onKeyDown
              onSubmit={handleEdit}
              className="relative py-1"
            >
              <div className="my-2 flex items-center justify-between px-3">
                <p className="text-xs text-gray-500">Edit Tag</p>
                {data !== tag && (
                  <button className="text-xs text-gray-500">Save</button>
                )}
              </div>
              <input
                type="text"
                autoFocus
                required
                value={data.name}
                onChange={(e) => setData({ ...data, name: e.target.value })}
                className="block w-full rounded-md border-gray-300 py-1 pr-7 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500"
              />
              <div className="grid grid-cols-3 gap-3 p-3 pb-0">
                {COLORS_LIST.map(({ color, css }) => (
                  <button
                    key={color}
                    type="button"
                    className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full transition-all duration-75 hover:scale-110 active:scale-90 ${css}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setData({ ...data, color });
                    }}
                  >
                    {data.color === color && <Check className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            </form>
          </div>
          <div className="p-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                confirm(
                  "Are you sure you want to delete this tag? All tagged links will be untagged, but they won't be deleted.",
                ) && handleDelete();
              }}
              className="flex w-full items-center space-x-2 rounded-md p-2 text-red-600 transition-colors hover:bg-red-100 active:bg-red-200"
            >
              <IconMenu
                text="Delete Tag"
                icon={<Trash className="h-4 w-4 text-red-600" />}
              />
            </button>
          </div>
        </div>
      }
      align="end"
      desktopOnly
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpenPopover(!openPopover);
        }}
        className={`${
          openPopover
            ? "bg-gray-200"
            : "hidden hover:bg-gray-200 group-hover:block"
        } rounded-md p-1 transition-colors`}
      >
        <ThreeDots className="h-4 w-4 text-gray-500" />
      </button>
    </Popover>
  );
};
