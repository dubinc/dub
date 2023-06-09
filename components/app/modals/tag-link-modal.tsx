import { useRouter } from "next/router";
import {
  Dispatch,
  SetStateAction,
  SyntheticEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { mutate } from "swr";
import BlurImage from "#/ui/blur-image";
import Modal from "@/components/shared/modal";
import { LinkProps, TagProps } from "#/lib/types";
import { getApexDomain, getQueryString, linkConstructor } from "#/lib/utils";
import { GOOGLE_FAVICON_URL } from "#/lib/constants";
import { toast } from "sonner";
import { Check, ChevronDown, Search, Trash, X } from "lucide-react";
import { Command } from "cmdk";
import Button from "#/ui/button";
import useTags from "#/lib/swr/use-tags";
import TagBadge, { COLORS_LIST } from "@/components/app/links/tag-badge";
import va from "@vercel/analytics";
import { ThreeDots } from "@/components/shared/icons";
import Popover from "@/components/shared/popover";
import IconMenu from "@/components/shared/icon-menu";
import { LoadingCircle } from "#/ui/icons";

function TagLinkModal({
  showTagLinkModal,
  setShowTagLinkModal,
  props,
}: {
  showTagLinkModal: boolean;
  setShowTagLinkModal: Dispatch<SetStateAction<boolean>>;
  props?: LinkProps;
}) {
  const router = useRouter();
  const { slug } = router.query;
  const [tagging, setTagging] = useState(false);
  const apexDomain = props?.url ? getApexDomain(props.url) : "dub.sh";

  const { domain, tagId } = props || {};

  const { tags } = useTags();
  const [tagValue, setTagValue] = useState(
    tags?.find((t) => t.id === tagId)?.name || "",
  );

  const saveDisabled = useMemo(() => {
    return tagging ||
      // if the tagId's value is the same as the tagValue, then we don't need to save
      (tagId && tags?.find((t) => t.id === tagId)?.name === tagValue)
      ? true
      : false;
  }, [tagging, tagId, tags, tagValue]);

  const type = useMemo(() => {
    if (props) {
      return {
        title: `Tag ${linkConstructor({
          key: props.key,
          domain,
          pretty: true,
        })}`,
        description: "Assign a tag to your short link",
        endpoint: `/api/links/${encodeURIComponent(
          props.key,
        )}/tag?slug=${slug}&domain=${domain}`,
        method: tagValue.length > 0 ? "POST" : "DELETE",
      };
    } else {
      return {
        title: "Add a Tag",
        description: "Tags can be used to group short links together.",
        endpoint: `/api/projects/${slug}/tags`,
        method: "POST",
      };
    }
  }, [props, slug, domain, tagValue]);

  const handleSubmit = useCallback(
    async (e?: SyntheticEvent) => {
      e?.preventDefault();
      setTagging(true);
      fetch(type.endpoint, {
        method: type.method,
        headers: {
          "Content-Type": "application/json",
        },
        ...(tagValue.length > 0 && {
          body: JSON.stringify({ tag: tagValue }),
        }),
      }).then(async (res) => {
        setTagging(false);
        if (res.status === 200) {
          mutate(`/api/projects/${slug}/tags`);
          if (props) {
            mutate(`/api/links${getQueryString(router)}`);
            mutate(
              `/api/links/_count${getQueryString(router, {
                groupBy: "tagId",
              })}`,
            );
            setShowTagLinkModal(false);
            toast.success(`Successfully updated shortlink!`);
            tagValue.length > 0 && va.track("Tagged Link");
          } else {
            toast.success(`Successfully added tag!`);
            setOpenCommandList(true);
            va.track("Added Tag");
          }
        } else {
          const error = await res.text();
          toast.error(error);
        }
      });
    },
    [props, tagValue, slug, domain, router],
  );

  const commandRef = useRef<HTMLDivElement | null>(null);
  const [openCommandList, setOpenCommandList] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        commandRef.current &&
        !commandRef.current.contains(e.target) &&
        // if the target is not part of a div that has
        // the data-exclude-click attribute
        e.target.closest("[data-exclude-click]") === null
      ) {
        setOpenCommandList(false);
      }
    };
    if (showTagLinkModal && openCommandList) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [commandRef, showTagLinkModal, openCommandList]);

  return (
    <Modal showModal={showTagLinkModal} setShowModal={setShowTagLinkModal}>
      <div className="inline-block w-full bg-white align-middle shadow-xl transition-all sm:max-w-md sm:rounded-2xl sm:border sm:border-gray-200">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 text-center sm:px-16">
          <BlurImage
            src={`${GOOGLE_FAVICON_URL}${apexDomain}`}
            alt={apexDomain}
            className="h-10 w-10 rounded-full"
            width={20}
            height={20}
          />
          <h3 className="text-lg font-medium">{type.title}</h3>
          <p className="text-sm text-gray-500">{type.description}</p>
        </div>

        <form
          className="flex flex-col space-y-4 bg-gray-50 px-4 py-8 text-left sm:rounded-b-2xl sm:px-16"
          onSubmit={handleSubmit}
        >
          <Command
            ref={commandRef}
            className="relative"
            loop
            shouldFilter={
              tagValue.length > 0 && !tags?.find((t) => t.name === tagValue)
            }
          >
            <div className="relative mt-1 w-full rounded-md">
              <Search className="absolute inset-y-0 left-0 my-auto h-7 w-7 pl-3 text-gray-400" />
              <Command.Input
                placeholder={props ? "Choose tag" : "Add a tag"}
                required={!props}
                // only show the dropdown if there are tags and the tagValue is not empty
                onFocus={() =>
                  tags && tags.length > 0 && setOpenCommandList(true)
                }
                value={tagValue}
                onValueChange={setTagValue}
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
                      handleSubmit();
                    }
                    // if it's a letter or a number and there's no meta key pressed, openCommandList dropdown
                  } else if (e.key.match(/^[a-z0-9]$/i) && !e.metaKey) {
                    setOpenCommandList(true);
                  }
                }}
                className="block w-full rounded-md border-gray-300 px-10 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500"
              />
              {tagValue ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setTagValue("");
                    setOpenCommandList(true);
                  }}
                  className="absolute inset-y-0 right-0 my-auto"
                >
                  <X className="h-7 w-7 pr-3 text-gray-400" />
                </button>
              ) : (
                <ChevronDown className="absolute inset-y-0 right-0 my-auto h-7 w-7 pr-3 text-gray-400" />
              )}
            </div>
            {openCommandList && (
              <Command.List
                data-exclude-click
                style={{
                  animationFillMode: "forwards", // to keep the last frame of the animation
                }}
                className="absolute z-10 h-[300px] w-full animate-input-select-slide-up overflow-auto rounded-md border border-gray-200 bg-white p-2 shadow-md transition-all sm:h-auto sm:max-h-[300px] sm:animate-input-select-slide-down"
              >
                <Command.Empty>
                  <button
                    type="button"
                    onClick={() => setOpenCommandList(false)}
                    className="flex w-full cursor-pointer items-center rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-900 hover:text-gray-900 aria-selected:bg-gray-100 aria-selected:text-gray-900"
                  >
                    {tagValue.length > 0 ? (
                      <>
                        Create tag{" "}
                        <span className="ml-1.5 rounded-md bg-blue-100 px-2 py-0.5 text-blue-600">
                          {tagValue}
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
                      setTagValue(tag.name);
                      setOpenCommandList(false);
                    }}
                    className="group flex cursor-pointer items-center justify-between rounded-md px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200 aria-selected:bg-gray-100 aria-selected:text-gray-900"
                  >
                    <TagBadge {...tag} />
                    <TagPopover key={tag.id} tag={tag} />
                  </Command.Item>
                ))}
              </Command.List>
            )}
          </Command>

          <Button
            loading={tagging}
            disabled={saveDisabled}
            text="Save changes"
          />
        </form>
      </div>
    </Modal>
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

export function useTagLinkModal({ props }: { props?: LinkProps }) {
  const [showTagLinkModal, setShowTagLinkModal] = useState(false);

  const TagLinkModalCallback = useCallback(() => {
    return (
      <TagLinkModal
        showTagLinkModal={showTagLinkModal}
        setShowTagLinkModal={setShowTagLinkModal}
        props={props}
      />
    );
  }, [showTagLinkModal, setShowTagLinkModal]);

  return useMemo(
    () => ({
      setShowTagLinkModal,
      TagLinkModal: TagLinkModalCallback,
    }),
    [setShowTagLinkModal, TagLinkModalCallback],
  );
}
