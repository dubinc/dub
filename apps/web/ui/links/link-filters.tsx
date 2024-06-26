import useDefaultDomains from "@/lib/swr/use-default-domains";
import useDomains from "@/lib/swr/use-domains";
import useLinks from "@/lib/swr/use-links";
import useLinksCount from "@/lib/swr/use-links-count";
import useTags from "@/lib/swr/use-tags";
import useWorkspace from "@/lib/swr/use-workspace";
import { DomainProps, TagProps } from "@/lib/types";
import TagBadge from "@/ui/links/tag-badge";
import { useAddEditTagModal } from "@/ui/modals/add-edit-tag-modal";
import { Delete, ThreeDots } from "@/ui/shared/icons";
import {
  Button,
  Copy,
  LoadingCircle,
  LoadingSpinner,
  Popover,
  Switch,
  Tick,
  useRouterStuff,
  useToastWithUndo,
} from "@dub/ui";
import {
  DUB_WORKSPACE_ID,
  SWIPE_REVEAL_ANIMATION_SETTINGS,
  isDubDomain,
  nFormatter,
  punycode,
  truncate,
} from "@dub/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Archive, ChevronRight, Edit3, Search, XCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { useDebouncedCallback } from "use-debounce";
import { useAddEditDomainModal } from "../modals/add-edit-domain-modal";

export default function LinkFilters() {
  const { data: domains } = useLinksCount({ groupBy: "domain" });

  const { tags } = useTags();
  const { data: tagsCount } = useLinksCount({ groupBy: "tagId" });

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { queryParams } = useRouterStuff();
  const searchInputRef = useRef(); // this is a hack to clear the search input when the clear button is clicked

  useEffect(() => {
    if (searchParams?.has("search")) {
      queryParams({
        set: { showArchived: "true" },
      });
    }
  }, [pathname, searchParams]);

  const showClearButton = useMemo(() => {
    return [
      "sort",
      "search",
      "domain",
      "userId",
      "tagIds",
      "showArchived",
      "page",
      "withTags",
    ].some((param) => searchParams?.has(param));
  }, [searchParams]);

  return domains ? (
    <div className="grid w-full rounded-md bg-white px-5 lg:divide-y lg:divide-gray-300">
      <div className="grid gap-3 py-6">
        <div className="flex items-center justify-between">
          <h3 className="ml-1 mt-2 font-semibold">Filter Links</h3>
          {showClearButton && <ClearButton searchInputRef={searchInputRef} />}
        </div>
        <div className="hidden lg:block">
          <SearchBox searchInputRef={searchInputRef} />
        </div>
      </div>
      <DomainsFilter />
      {tags && tagsCount && (
        <>
          <TagsFilter tags={tags} tagsCount={tagsCount} />
          <MyLinksFilter />
          <ArchiveFilter />
        </>
      )}
    </div>
  ) : (
    <div className="grid h-full gap-6 rounded-md bg-white p-5">
      <div className="h-[400px] w-full animate-pulse rounded-md bg-gray-200" />
    </div>
  );
}

const ClearButton = ({ searchInputRef }) => {
  const router = useRouter();
  const { slug } = useParams() as { slug?: string };
  return (
    <button
      onClick={() => {
        router.replace(`/${slug}`);
        searchInputRef.current.value = "";
      }}
      className="group flex items-center justify-center space-x-1 rounded-md border border-gray-400 px-2 py-1 transition-all hover:border-gray-600 active:bg-gray-100"
    >
      <XCircle className="h-4 w-4 text-gray-500 transition-all group-hover:text-black" />
      <p className="text-sm text-gray-500 transition-all group-hover:text-black">
        Clear
      </p>
    </button>
  );
};

export const SearchBox = ({ searchInputRef }) => {
  const searchParams = useSearchParams();
  const { queryParams } = useRouterStuff();
  const debounced = useDebouncedCallback((value) => {
    queryParams({
      set: {
        search: value,
      },
      del: "page",
    });
  }, 500);
  const { isValidating } = useLinks();

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    // only focus on filter input when:
    // - user is not typing in an input or textarea
    // - there is no existing modal backdrop (i.e. no other modal is open)
    if (
      e.key === "/" &&
      target.tagName !== "INPUT" &&
      target.tagName !== "TEXTAREA"
    ) {
      e.preventDefault();
      searchInputRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
        {isValidating && searchInputRef.current?.value.length > 0 ? (
          <LoadingSpinner className="h-4 w-4" />
        ) : (
          <Search className="h-4 w-4 text-gray-400" />
        )}
      </div>
      <input
        ref={searchInputRef}
        type="text"
        className="peer w-full rounded-md border border-gray-200 px-10 text-black outline-none transition-all placeholder:text-gray-400 focus:border-gray-500 focus:ring-4 focus:ring-gray-200 sm:text-sm"
        placeholder="Search..."
        defaultValue={searchParams?.get("search") || ""}
        onChange={(e) => {
          debounced(e.target.value);
        }}
      />
      {searchInputRef.current?.value.length > 0 && (
        <button
          onClick={() => {
            searchInputRef.current.value = "";
            queryParams({ del: "search" });
          }}
          className="pointer-events-auto absolute inset-y-0 right-0 flex items-center pr-4 lg:hidden"
        >
          <XCircle className="h-4 w-4 text-gray-600" />
        </button>
      )}
    </div>
  );
};

const DomainsFilter = () => {
  const searchParams = useSearchParams();
  const { queryParams } = useRouterStuff();
  const { data: domains } = useLinksCount({ groupBy: "domain" });
  const { id: workspaceId } = useWorkspace();
  const { activeWorkspaceDomains, activeDefaultDomains } = useDomains();

  const [collapsed, setCollapsed] = useState(true);
  const [showMore, setShowMore] = useState(false);

  const { AddEditDomainModal, AddDomainButton } = useAddEditDomainModal({
    buttonProps: {
      text: "Add",
      variant: "secondary",
      className: "h-7 px-2",
    },
  });

  const options = useMemo(() => {
    if (domains?.length === 0) return [];

    const workspaceDomains = activeWorkspaceDomains?.map((domain) => ({
      ...domain,
      count: domains?.find(({ domain: d }) => d === domain.slug)?._count || 0,
    }));

    const defaultDomains =
      workspaceId === `ws_${DUB_WORKSPACE_ID}`
        ? []
        : activeDefaultDomains
            ?.map((domain) => ({
              ...domain,
              count:
                domains?.find(({ domain: d }) => d === domain.slug)?._count ||
                0,
            }))
            .filter((d) => d.count > 0);

    const finalOptions = [
      ...(workspaceDomains || []),
      ...(defaultDomains || []),
    ].sort((a, b) => b.count - a.count);

    return finalOptions;
  }, [activeWorkspaceDomains, activeDefaultDomains, domains, workspaceId]);

  useEffect(() => {
    if (options.length > 0) {
      setCollapsed(false);
    }
  }, []);

  return (
    <fieldset className="overflow-hidden py-6">
      <AddEditDomainModal />
      <div className="flex h-8 items-center justify-between">
        <button
          onClick={() => {
            setCollapsed(!collapsed);
          }}
          className="flex items-center space-x-2"
        >
          <ChevronRight
            className={`${collapsed ? "" : "rotate-90"} h-5 w-5 transition-all`}
          />
          <h4 className="font-medium text-gray-900">Domains</h4>
        </button>
        <AddDomainButton />
      </div>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            className="mt-4 grid gap-2"
            {...SWIPE_REVEAL_ANIMATION_SETTINGS}
          >
            {options.length === 0 ? ( // if the workspace has no domains
              <p className="text-center text-sm text-gray-500">
                No domains yet.
              </p>
            ) : (
              options.slice(0, showMore ? options.length : 4).map((domain) => (
                <div
                  key={domain.slug}
                  className="group relative flex cursor-pointer items-center space-x-3 rounded-md bg-gray-50 transition-all hover:bg-gray-100"
                >
                  <input
                    id={domain.slug}
                    name={domain.slug}
                    checked={searchParams?.get("domain") === domain.slug}
                    onChange={() => {
                      queryParams({
                        set: {
                          domain: domain.slug,
                        },
                        del: "page",
                      });
                    }}
                    type="radio"
                    className="ml-3 h-4 w-4 cursor-pointer rounded-full border-gray-300 text-black focus:outline-none focus:ring-0"
                  />
                  <label
                    htmlFor={domain.slug}
                    className="flex w-full cursor-pointer items-center justify-between px-3 py-2 pl-0 text-sm font-medium text-gray-700"
                  >
                    <p>{truncate(punycode(domain.slug), 24)}</p>
                    <DomainPopover domain={domain} count={domain.count} />
                  </label>
                </div>
              ))
            )}
            {options.length > 4 && (
              <button
                onClick={() => setShowMore(!showMore)}
                className="rounded-md border border-gray-300 p-1 text-center text-sm"
              >
                Show {showMore ? "less" : "more"}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </fieldset>
  );
};

const DomainPopover = ({
  domain,
  count,
}: {
  domain: DomainProps;
  count: number;
}) => {
  const { id, slug } = useWorkspace();
  const [openPopover, setOpenPopover] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { mutate: mutateDomains } = useDomains();
  const { defaultDomains, mutate: mutateDefaultDomains } = useDefaultDomains();

  const { AddEditDomainModal, setShowAddEditDomainModal } =
    useAddEditDomainModal({
      props: domain,
    });

  const toastWithUndo = useToastWithUndo();

  const archiveDomain = (archive: boolean) => {
    return fetch(`/api/domains/${domain.slug}?workspaceId=${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ archived: archive }),
    });
  };

  const archiveDefaultDomain = (archive: boolean) => {
    const newDefaultDomains = archive
      ? defaultDomains?.filter((d) => d !== domain.slug)
      : [...(defaultDomains || []), domain.slug];
    return fetch(`/api/domains/default?workspaceId=${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        defaultDomains: newDefaultDomains,
      }),
    });
  };

  const handleArchiveRequest = async () => {
    setProcessing(true);
    if (isDubDomain(domain.slug)) {
      const res = await archiveDefaultDomain(true);
      if (res.ok) {
        await mutateDefaultDomains();
        toastWithUndo({
          id: "domain-archive-undo-toast",
          message: "Successfully archived domain!",
          undo: () =>
            toast.promise(archiveDefaultDomain(false), {
              loading: "Undo in progress...",
              success: () => {
                mutateDefaultDomains();
                return "Undo successful! Changes reverted.";
              },
              error: "Failed to roll back changes. An error occurred.",
            }),
          duration: 5000,
        });
      } else {
        const { error } = await res.json();
        setProcessing(false);
        toast.error(error.message);
      }
    } else {
      const res = await archiveDomain(true);
      if (res.ok) {
        await mutateDomains();
        toastWithUndo({
          id: "domain-archive-undo-toast",
          message: `Successfully archived domain!`,
          undo: () =>
            toast.promise(archiveDomain(false), {
              loading: "Undo in progress...",
              success: () => {
                mutateDomains();
                return "Undo successful! Changes reverted.";
              },
              error: "Failed to roll back changes. An error occurred.",
            }),
          duration: 5000,
        });
      } else {
        const { error } = await res.json();
        setProcessing(false);
        toast.error(error.message);
      }
    }
  };

  return processing ? (
    <div className="flex h-6 items-center justify-center">
      <LoadingCircle />
    </div>
  ) : (
    <>
      <Popover
        content={
          <div className="grid w-full gap-px p-2 sm:w-48">
            {(!isDubDomain(domain.slug) || slug === "dub") && (
              <Button
                type="button"
                text="Edit"
                variant="outline"
                onClick={() => {
                  setOpenPopover(false);
                  setShowAddEditDomainModal(true);
                }}
                icon={<Edit3 className="h-4 w-4" />}
                className="h-9 w-full justify-start px-2 font-medium"
              />
            )}
            <Button
              type="button"
              text="Archive"
              variant="outline"
              onClick={() => {
                setOpenPopover(false);
                handleArchiveRequest();
              }}
              icon={<Archive className="h-4 w-4" />}
              className="h-9 w-full justify-start px-2 font-medium"
            />
          </div>
        }
        align="end"
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}
      >
        <button
          type="button"
          onClick={() => setOpenPopover(!openPopover)}
          className={`${
            openPopover ? "bg-gray-200" : "hover:bg-gray-200"
          } flex h-6 items-center justify-center rounded-md transition-colors`}
        >
          <ThreeDots
            className={`h-4 w-4 text-gray-500 ${
              openPopover ? "" : "hidden group-hover:block"
            }`}
          />
          <p
            className={`text-gray-500 ${
              openPopover ? "hidden" : "group-hover:hidden"
            }`}
          >
            {nFormatter(count)}
          </p>
        </button>
      </Popover>
      <AddEditDomainModal />
    </>
  );
};

const TagsFilter = ({
  tags,
  tagsCount,
}: {
  tags: TagProps[];
  tagsCount: { tagId: string; _count: number }[];
}) => {
  const searchParams = useSearchParams();
  const { queryParams } = useRouterStuff();
  const [collapsed, setCollapsed] = useState(tags.length === 0 ? true : false);
  const [search, setSearch] = useState("");
  const [showMore, setShowMore] = useState(false);

  const { AddEditTagModal, AddTagButton } = useAddEditTagModal();

  const selectedTagIds =
    searchParams?.get("tagIds")?.split(",")?.filter(Boolean) ?? [];

  const onCheckboxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTags = e.target.checked
        ? [...selectedTagIds, e.target.id]
        : selectedTagIds.filter((tagId) => tagId !== e.target.id) ?? [];
      queryParams({
        set: {
          tagIds: newTags,
        },
        del: [
          "page",
          // Remove tagId from params if empty
          ...(newTags.length ? [] : ["tagIds"]),
        ],
      });
    },
    [selectedTagIds],
  );

  const options = useMemo(() => {
    const initialOptions = tags
      .map((tag) => ({
        ...tag,
        count: tagsCount.find(({ tagId }) => tagId === tag.id)?._count || 0,
      }))
      .sort((a, b) => b.count - a.count);
    // filter options based on search
    return search.length > 0
      ? initialOptions.filter(({ name }) =>
          name.toLowerCase().includes(search.toLowerCase()),
        )
      : initialOptions;
  }, [tagsCount, tags, search]);

  return (
    <fieldset className="overflow-hidden py-6">
      <AddEditTagModal />
      <div className="flex h-8 items-center justify-between">
        <button
          onClick={() => {
            setCollapsed(!collapsed);
          }}
          className="flex items-center space-x-2"
        >
          <ChevronRight
            className={`${collapsed ? "" : "rotate-90"} h-5 w-5 transition-all`}
          />
          <h4 className="font-medium text-gray-900">Tags</h4>
        </button>
        <AddTagButton />
      </div>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            className="mt-4 grid gap-2"
            {...SWIPE_REVEAL_ANIMATION_SETTINGS}
          >
            {tags?.length === 0 ? ( // if the workspace has no tags
              <p className="text-center text-sm text-gray-500">No tags yet.</p>
            ) : (
              <>
                <div className="relative mb-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="peer w-full rounded-md border border-gray-300 py-1.5 pl-10 text-sm text-black placeholder:text-gray-400 focus:border-black focus:ring-0"
                    placeholder="Filter tags"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                {options.length === 0 && (
                  <p className="mt-1 text-center text-sm text-gray-500">
                    No tags match your search.
                  </p>
                )}
              </>
            )}
            {options
              .slice(0, showMore ? options.length : 4)
              .map(({ id, name, color, count }) => (
                <div
                  key={id}
                  className="group relative flex cursor-pointer items-center space-x-3 rounded-md bg-gray-50 transition-all hover:bg-gray-100"
                >
                  <input
                    id={id}
                    name={id}
                    checked={selectedTagIds.includes(id)}
                    onChange={onCheckboxChange}
                    type="checkbox"
                    className="ml-3 h-4 w-4 cursor-pointer rounded-full border-gray-300 text-black focus:outline-none focus:ring-0"
                  />
                  <label
                    htmlFor={id}
                    className="flex w-full cursor-pointer justify-between px-3 py-1.5 pl-0 text-sm font-medium text-gray-700"
                  >
                    <TagBadge name={name} color={color} />
                    <TagPopover tag={{ id, name, color }} count={count} />
                  </label>
                </div>
              ))}
            {options.length > 4 && (
              <button
                onClick={() => setShowMore(!showMore)}
                className="rounded-md border border-gray-300 p-1 text-center text-sm"
              >
                Show {showMore ? "less" : "more"}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </fieldset>
  );
};

const TagPopover = ({ tag, count }: { tag: TagProps; count: number }) => {
  const { id } = useWorkspace();
  const [openPopover, setOpenPopover] = useState(false);
  const [processing, setProcessing] = useState(false);

  const { AddEditTagModal, setShowAddEditTagModal } = useAddEditTagModal({
    props: tag,
  });

  const { queryParams } = useRouterStuff();

  const handleDelete = async () => {
    setProcessing(true);
    fetch(`/api/tags/${tag.id}?workspaceId=${id}`, {
      method: "DELETE",
    }).then(async (res) => {
      if (res.ok) {
        queryParams({ del: "tagIds" });
        await Promise.all([
          mutate(`/api/tags?workspaceId=${id}`),
          mutate(
            (key) => typeof key === "string" && key.startsWith("/api/links"),
            undefined,
            { revalidate: true },
          ),
        ]);
        toast.success("Tag deleted");
      } else {
        const { error } = await res.json();
        toast.error(error.message);
      }
      setProcessing(false);
    });
  };

  const [copied, setCopied] = useState(false);

  return processing ? (
    <div className="flex h-6 items-center justify-center">
      <LoadingCircle />
    </div>
  ) : (
    <>
      <Popover
        content={
          <div className="grid w-full gap-px p-2 sm:w-48">
            <Button
              type="button"
              text="Edit"
              variant="outline"
              onClick={() => setShowAddEditTagModal(true)}
              icon={<Edit3 className="h-4 w-4" />}
              className="h-9 w-full justify-start px-2 font-medium"
            />
            <Button
              type="button"
              text="Copy Tag ID"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(tag.id);
                setCopied(true);
                toast.success("Tag ID copied");
                setTimeout(() => setCopied(false), 3000);
              }}
              icon={
                copied ? (
                  <Tick className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )
              }
              className="h-9 w-full justify-start px-2 font-medium"
            />
            <Button
              type="button"
              text="Delete"
              variant="danger-outline"
              onClick={() => {
                confirm(
                  "Are you sure you want to delete this tag? All tagged links will be untagged, but they won't be deleted.",
                ) && handleDelete();
              }}
              icon={<Delete className="h-4 w-4" />}
              className="h-9 w-full justify-start px-2 font-medium"
            />
          </div>
        }
        align="end"
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}
      >
        <button
          type="button"
          onClick={() => setOpenPopover(!openPopover)}
          className={`${
            openPopover ? "bg-gray-200" : "hover:bg-gray-200"
          } -mr-1 flex h-6 w-5 items-center justify-center rounded-md transition-colors`}
        >
          <ThreeDots
            className={`h-4 w-4 text-gray-500 ${
              openPopover ? "" : "hidden group-hover:block"
            }`}
          />
          <p
            className={`text-gray-500 ${
              openPopover ? "hidden" : "group-hover:hidden"
            }`}
          >
            {nFormatter(count)}
          </p>
        </button>
      </Popover>
      <AddEditTagModal />
    </>
  );
};

const MyLinksFilter = () => {
  const searchParams = useSearchParams();
  const { queryParams } = useRouterStuff();
  const userId = searchParams?.get("userId");
  const { data: session } = useSession();

  return (
    <div className="flex items-center justify-between py-6">
      <label className="text-sm font-medium text-gray-600">
        Show my links only
      </label>
      <Switch
        fn={() =>
          queryParams(
            userId
              ? { del: "userId" }
              : {
                  set: {
                    // @ts-ignore
                    userId: session?.user?.id,
                  },
                },
          )
        }
        checked={userId ? true : false}
      />
    </div>
  );
};

const ArchiveFilter = () => {
  const searchParams = useSearchParams();
  const { queryParams } = useRouterStuff();
  const showArchived = searchParams?.get("showArchived");
  return (
    <div className="flex items-center justify-between py-6">
      <label className="text-sm font-medium text-gray-600">
        Include archived links
      </label>
      <Switch
        fn={() =>
          queryParams(
            showArchived
              ? { del: "showArchived" }
              : {
                  set: {
                    showArchived: "true",
                  },
                },
          )
        }
        checked={showArchived ? true : false}
      />
    </div>
  );
};
