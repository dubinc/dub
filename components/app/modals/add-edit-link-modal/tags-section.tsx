import {
  Dispatch,
  KeyboardEvent,
  SetStateAction,
  useCallback,
  useRef,
  useState,
} from "react";
import { Check, Trash, X } from "lucide-react";
import { Command } from "cmdk";
import TagBadge, { COLORS_LIST } from "../../links/tag-badge";
import { LinkProps, TagProps } from "#/lib/types";
import Switch from "#/ui/switch";
import { motion } from "framer-motion";
import { FADE_IN_ANIMATION_SETTINGS } from "#/lib/constants";
import useTags from "#/lib/swr/use-tags";
import { useRouter } from "next/router";
import { toast } from "sonner";
import { mutate } from "swr";
import { LoadingCircle } from "#/ui/icons";
import Popover from "@/components/shared/popover";
import IconMenu from "@/components/shared/icon-menu";
import { ThreeDots } from "@/components/shared/icons";

export default function TagsSection({
  props,
  data,
  setData,
}: {
  props?: LinkProps;
  data: LinkProps;
  setData: Dispatch<SetStateAction<LinkProps>>;
}) {
  const { tagId } = data;
  const { tags } = useTags();

  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<TagProps[]>(
    tags?.filter((tag) => tag.id === tagId) || [],
  );
  const [inputValue, setInputValue] = useState("");

  const handleUnselect = useCallback((tag: TagProps) => {
    setSelected((prev) => prev.filter((s) => s.id !== tag.id));
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    const input = inputRef.current;
    if (input) {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (input.value === "") {
          setSelected((prev) => {
            const newSelected = [...prev];
            newSelected.pop();
            return newSelected;
          });
        }
      }
      // This is not a default behaviour of the <input /> field
      if (e.key === "Escape") {
        input.blur();
      }
    }
  }, []);

  return (
    <div className="border-b border-gray-200 pb-5">
      <h2 className="text-sm font-medium text-gray-900">Tags</h2>
      <Command
        className="mt-3 overflow-visible bg-white"
        loop
        shouldFilter={
          inputValue.length > 0 && !tags?.find((t) => t.name === inputValue)
        }
      >
        <div className="group rounded-md border border-gray-300 px-1 focus-within:border-gray-500 focus-within:ring-1 focus-within:ring-gray-500">
          <div className="flex flex-wrap gap-1">
            {selected.map((tag) => {
              return (
                //   <Badge key={framework.value} variant="secondary">
                //     {framework.label}
                //     <button
                //       className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                //       onKeyDown={(e) => {
                //         if (e.key === "Enter") {
                //           handleUnselect(framework);
                //         }
                //       }}
                //       onMouseDown={(e) => {
                //         e.preventDefault();
                //         e.stopPropagation();
                //       }}
                //       onClick={() => handleUnselect(framework)}
                //     >
                //       <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                //     </button>
                //   </Badge>
                <TagBadge key={tag.id} {...tag} />
              );
            })}
            <Command.Input
              ref={inputRef}
              value={inputValue}
              onValueChange={setInputValue}
              onKeyDown={handleKeyDown}
              onBlur={() => setOpen(false)}
              onFocus={() => setOpen(true)}
              placeholder="Choose tag"
              className="flex-1 rounded-r-md border-none text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-0"
            />
          </div>
        </div>
        <div className="relative">
          {open && tags && tags.length > 0 ? (
            <div
              style={{
                animationFillMode: "forwards", // to keep the last frame of the animation
              }}
              className="absolute z-10 h-[300px] w-full animate-input-select-slide-up overflow-auto rounded-md border border-gray-200 bg-white p-2 shadow-md transition-all sm:h-auto sm:max-h-[300px] sm:animate-input-select-slide-down"
            >
              <Command className="h-full overflow-auto">
                {tags.map((tag) => {
                  return (
                    <Command.Item
                      key={tag.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onSelect={() => {
                        setInputValue("");
                        setSelected((prev) => [...prev, tag]);
                      }}
                      className="group flex cursor-pointer items-center justify-between rounded-md px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200 aria-selected:bg-gray-100 aria-selected:text-gray-900"
                    >
                      <TagBadge key={tag.id} {...tag} />
                      <TagPopover key={tag.id} tag={tag} />
                    </Command.Item>
                  );
                })}
              </Command>
            </div>
          ) : null}
        </div>
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
        <div
          data-exclude-click
          className="flex w-48 flex-col divide-y divide-gray-200"
        >
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
