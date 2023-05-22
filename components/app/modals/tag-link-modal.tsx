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
import { LinkProps } from "@/lib/types";
import { getApexDomain, getQueryString, linkConstructor } from "@/lib/utils";
import { GOOGLE_FAVICON_URL } from "@/lib/constants";
import { toast } from "sonner";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { Command } from "cmdk";
import Button from "#/ui/button";
import useTags from "@/lib/swr/use-tags";
import Badge from "@/components/shared/badge";
import va from "@vercel/analytics";
import useWindowSize from "#/lib/hooks/use-window-size";

function TagLinkModal({
  showTagLinkModal,
  setShowTagLinkModal,
  props,
}: {
  showTagLinkModal: boolean;
  setShowTagLinkModal: Dispatch<SetStateAction<boolean>>;
  props: LinkProps;
}) {
  const router = useRouter();
  const { slug } = router.query;
  const [tagging, setTagging] = useState(false);
  const apexDomain = getApexDomain(props.url);

  const { key, domain, tagId } = props;

  const { tags } = useTags();
  const [tagValue, setTagValue] = useState(
    tags?.find((t) => t.id === tagId)?.name || "",
  );

  const shortlink = useMemo(() => {
    return linkConstructor({
      key,
      domain,
      pretty: true,
    });
  }, [key, domain]);

  const handleSubmit = useCallback(
    async (e?: SyntheticEvent) => {
      e?.preventDefault();
      setTagging(true);
      fetch(
        `/api/links/${encodeURIComponent(
          props.key,
        )}/tag?slug=${slug}&domain=${domain}`,
        {
          method: tagValue.length > 0 ? "POST" : "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          ...(tagValue.length > 0 && {
            body: JSON.stringify({ tag: tagValue }),
          }),
        },
      ).then(async (res) => {
        setTagging(false);
        if (res.status === 200) {
          mutate(`/api/links${getQueryString(router)}`);
          mutate(`/api/projects/${slug}/tags`);
          mutate(
            `/api/links/_count${getQueryString(router, {
              groupBy: "tagId",
            })}`,
          );
          setShowTagLinkModal(false);
          toast.success(`Successfully updated shortlink!`);
          tagValue.length > 0 && va.track("Tagged Link");
        } else {
          const error = await res.text();
          toast.error(error);
        }
      });
    },
    [props, tagValue, slug, domain, router],
  );

  const commandRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const { width } = useWindowSize();
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (commandRef.current && !commandRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    // only for desktop
    if (width > 768) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [commandRef, width]);

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
          <h3 className="text-lg font-medium">Tag {shortlink}</h3>
          <p className="text-sm text-gray-500">
            Assign a tag to your short link
          </p>
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
                placeholder="Choose tag"
                onFocus={() => tags && tags.length > 0 && setOpen(true)}
                value={tagValue}
                onValueChange={setTagValue}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.stopPropagation();
                    setOpen(false);
                  } else if (e.key === "Enter") {
                    if (open) {
                      // if dropdown is open, close it
                      setOpen(false);
                    } else {
                      // if dropdown is already closed, submit form
                      handleSubmit();
                    }
                  } else {
                    setOpen(true);
                  }
                }}
                className="block w-full rounded-md border-gray-300 px-10 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500"
              />
              {tagValue ? (
                <button
                  onClick={() => {
                    setTagValue("");
                    setOpen(true);
                  }}
                  className="absolute inset-y-0 right-0 my-auto"
                >
                  <X className="h-7 w-7 pr-3 text-gray-400" />
                </button>
              ) : (
                <ChevronDown className="absolute inset-y-0 right-0 my-auto h-7 w-7 pr-3 text-gray-400" />
              )}
            </div>
            {open && (
              <Command.List
                style={{
                  animationFillMode: "forwards", // to keep the last frame of the animation
                }}
                className="absolute z-10 h-[300px] w-full animate-input-select-slide-up overflow-auto rounded-md border border-gray-200 bg-white p-2 transition-all sm:h-auto sm:max-h-[300px] sm:animate-input-select-slide-down"
              >
                <Command.Empty>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
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
                      setOpen(false);
                    }}
                    className="flex cursor-pointer items-center justify-between rounded-md px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200 aria-selected:bg-gray-100 aria-selected:text-gray-900"
                  >
                    <Badge {...tag} />
                    {tagValue === tag.name && (
                      <Check className="h-4 w-4 text-gray-500" />
                    )}
                  </Command.Item>
                ))}
              </Command.List>
            )}
          </Command>

          <Button loading={tagging} text="Confirm selection" />
        </form>
      </div>
    </Modal>
  );
}

export function useTagLinkModal({ props }: { props: LinkProps }) {
  const [showTagLinkModal, setShowTagLinkModal] = useState(false);

  const TagLinkModalCallback = useCallback(() => {
    return props ? (
      <TagLinkModal
        showTagLinkModal={showTagLinkModal}
        setShowTagLinkModal={setShowTagLinkModal}
        props={props}
      />
    ) : null;
  }, [showTagLinkModal, setShowTagLinkModal]);

  return useMemo(
    () => ({
      setShowTagLinkModal,
      TagLinkModal: TagLinkModalCallback,
    }),
    [setShowTagLinkModal, TagLinkModalCallback],
  );
}
