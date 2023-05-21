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
import { ChevronDown, Search, X } from "lucide-react";
import { Command } from "cmdk";
import Button from "#/ui/button";
import useTags from "@/lib/swr/use-tags";
import Badge from "@/components/shared/badge";

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
  const [selectedTag, setSelectedTag] = useState(
    tags?.find((t) => t.id === tagId),
  );
  const [value, setValue] = useState(selectedTag?.name || "");

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
      console.log(selectedTag, value);
      fetch(
        `/api/links/${encodeURIComponent(
          props.key,
        )}/tag?slug=${slug}&domain=${domain}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tagId:
              selectedTag && value === selectedTag.name ? selectedTag.id : null,
          }),
        },
      ).then(async (res) => {
        setTagging(false);
        if (res.status === 200) {
          mutate(`/api/links${getQueryString(router)}`);
          mutate(
            `/api/links/_count${getQueryString(router, {
              groupBy: "tagId",
            })}`,
          );
          setShowTagLinkModal(false);
          toast.success(`Successfully tagged shortlink!`);
        } else {
          const error = await res.text();
          toast.error(error);
        }
      });
    },
    [props, selectedTag, slug, domain, router],
  );

  const ref = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref]);

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
          className="flex flex-col space-y-4 bg-gray-50 px-4 py-8 text-left sm:px-16"
          onSubmit={handleSubmit}
        >
          <div>
            <label
              htmlFor="Tag Selection"
              className="block text-sm text-gray-700"
            >
              Tag
            </label>
            <Command ref={ref} className="relative" loop>
              <div className="relative mt-3 w-full rounded-md">
                <Search className="absolute inset-y-0 left-0 my-auto h-7 w-7 pl-3 text-gray-400" />
                <Command.Input
                  placeholder="Choose tag"
                  onFocus={() => setOpen(true)}
                  value={value}
                  onValueChange={setValue}
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
                {value ? (
                  <button
                    onClick={() => {
                      setValue("");
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
                <Command.List className="absolute z-10 mt-2 max-h-[300px] w-full animate-slide-down overflow-auto rounded-md border border-gray-200 bg-white p-2 transition-all">
                  <Command.Empty>
                    <button
                      type="button"
                      className="flex w-full cursor-pointer items-center rounded-md px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 hover:text-gray-900 aria-selected:bg-gray-100 aria-selected:text-gray-900"
                    >
                      Create tag{" "}
                      <span className="ml-1.5 rounded-md bg-red-100 px-2 py-0.5 text-red-600">
                        {value}
                      </span>
                    </button>
                  </Command.Empty>
                  {tags?.map((tag) => (
                    <Command.Item
                      key={tag.id}
                      value={tag.name}
                      onSelect={() => {
                        setValue(tag.name);
                        setSelectedTag(tag);
                        setOpen(false);
                      }}
                      className="flex cursor-pointer items-center rounded-md px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200 aria-selected:bg-gray-100 aria-selected:text-gray-900"
                    >
                      <Badge {...tag} />
                    </Command.Item>
                  ))}
                </Command.List>
              )}
            </Command>
          </div>

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
