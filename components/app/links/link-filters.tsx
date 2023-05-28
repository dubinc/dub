import { useRouter } from "next/router";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { nFormatter, setQueryString } from "@/lib/utils";
import { ChevronRight, XCircle, Search } from "lucide-react";
import useDomains from "@/lib/swr/use-domains";
import { AnimatePresence, motion } from "framer-motion";
import { SWIPE_REVEAL_ANIMATION_SETTINGS } from "@/lib/constants";
import { useDebouncedCallback } from "use-debounce";
import useLinks from "@/lib/swr/use-links";
import { LoadingSpinner } from "#/ui/icons";
import useLinksCount from "@/lib/swr/use-links-count";
import punycode from "punycode/";
import Switch from "#/ui/switch";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ModalContext } from "#/ui/modal-provider";
import useTags from "@/lib/swr/use-tags";
import TagBadge from "@/components/app/links/tag-badge";
import { TagProps } from "@/lib/types";
import Badge from "#/ui/badge";

export default function LinkFilters() {
  const { primaryDomain } = useDomains();
  const { data: domains } = useLinksCount({ groupBy: "domain" });

  const { tags } = useTags();
  const { data: tagsCount } = useLinksCount({ groupBy: "tagId" });

  const router = useRouter();
  const { slug, sort, search, domain, userId, tagId } = router.query as {
    slug: string;
    sort?: string;
    search?: string;
    domain?: string;
    userId?: string;
    tagId?: string;
  };
  const searchInputRef = useRef(); // this is a hack to clear the search input when the clear button is clicked

  return domains && tags && tagsCount ? (
    <div className="grid w-full rounded-md bg-white px-5 lg:divide-y lg:divide-gray-300">
      <div className="grid gap-3 py-6">
        <div className="flex items-center justify-between">
          <h3 className="ml-1 mt-2 font-semibold">Filter Links</h3>
          {(sort || search || domain || userId || tagId) && (
            <ClearButton searchInputRef={searchInputRef} />
          )}
        </div>
        <SearchBox searchInputRef={searchInputRef} />
      </div>
      <DomainsFilter domains={domains} primaryDomain={primaryDomain} />
      <TagsFilter tags={tags} tagsCount={tagsCount} />
      {slug && <MyLinksFilter />}
      <ArchiveFilter />
    </div>
  ) : (
    <div className="grid h-full gap-6 rounded-md bg-white p-5">
      <div className="h-[400px] w-full animate-pulse rounded-md bg-gray-200" />
    </div>
  );
}

const ClearButton = ({ searchInputRef }) => {
  const router = useRouter();
  const { slug } = router.query;
  return (
    <button
      onClick={() => {
        router.replace(`/${slug || "links"}`).then(() => {
          searchInputRef.current.value = "";
        });
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

const SearchBox = ({ searchInputRef }) => {
  const router = useRouter();
  const debounced = useDebouncedCallback((value) => {
    setQueryString(router, "search", value);
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
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        {isValidating && searchInputRef.current?.value.length > 0 ? (
          <LoadingSpinner />
        ) : (
          <Search className="h-4 w-4 text-gray-400" />
        )}
      </div>
      <input
        ref={searchInputRef}
        type="text"
        className="peer w-full rounded-md border border-gray-300 pl-10 text-sm text-black placeholder:text-gray-400 focus:border-black focus:ring-0"
        placeholder="Search..."
        defaultValue={router.query.search}
        onChange={(e) => {
          debounced(e.target.value);
        }}
      />
    </div>
  );
};

const DomainsFilter = ({ domains, primaryDomain }) => {
  const router = useRouter();
  const { slug } = router.query as { slug?: string };

  const [collapsed, setCollapsed] = useState(false);

  const options =
    domains.length === 0
      ? [
          {
            name: primaryDomain || "",
            value: primaryDomain || "",
            count: 0,
          },
        ]
      : domains.map(({ domain, _count }) => ({
          name: domain,
          value: domain,
          count: _count,
        }));

  const { setShowAddEditDomainModal, setShowAddProjectModal } =
    useContext(ModalContext);

  return (
    <fieldset className="overflow-hidden py-6">
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
        <button
          onClick={() => {
            if (slug) {
              setShowAddEditDomainModal(true);
            } else {
              setShowAddProjectModal(true);
              toast.error(
                "You can only add a domain to a custom project. Please create a new project or navigate to an existing one.",
              );
            }
          }}
          className="mr-2 rounded-md border border-gray-200 px-3 py-1 transition-all hover:border-gray-600 active:bg-gray-100"
        >
          <p className="text-sm text-gray-500">Add</p>
        </button>
      </div>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            className="mt-4 grid gap-2"
            {...SWIPE_REVEAL_ANIMATION_SETTINGS}
          >
            {options?.map(({ name, value, count }) => (
              <div
                key={value}
                className="relative flex cursor-pointer items-center space-x-3 rounded-md bg-gray-50 transition-all hover:bg-gray-100"
              >
                <input
                  id={value}
                  name={value}
                  checked={router.query.domain === value || domains.length <= 1}
                  onChange={() => {
                    setQueryString(router, "domain", value);
                  }}
                  type="radio"
                  className="ml-3 h-4 w-4 cursor-pointer rounded-full border-gray-300 text-black focus:outline-none focus:ring-0"
                />
                <label
                  htmlFor={value}
                  className="flex w-full cursor-pointer justify-between px-3 py-2 pl-0 text-sm font-medium text-gray-700"
                >
                  <p>{punycode.toUnicode(name || "")}</p>
                  <p className="text-gray-500">{nFormatter(count)}</p>
                </label>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </fieldset>
  );
};

const TagsFilter = ({
  tags,
  tagsCount,
}: {
  tags: TagProps[];
  tagsCount: { tagId: string; _count: number }[];
}) => {
  const router = useRouter();
  const { slug } = router.query as { slug?: string };
  const [collapsed, setCollapsed] = useState(tags.length === 0 ? true : false);
  const [search, setSearch] = useState("");
  const [showMore, setShowMore] = useState(false);

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

  const { setShowTagLinkModal, setShowAddProjectModal } =
    useContext(ModalContext);

  const addTag = useCallback(() => {
    if (slug) {
      setShowTagLinkModal(true);
    } else {
      setShowAddProjectModal(true);
      toast.error(
        "You can only add a tag to a custom project. Please create a new project or navigate to an existing one.",
      );
    }
  }, [setShowTagLinkModal, setShowAddProjectModal, slug]);

  return (
    <fieldset className="overflow-hidden py-6">
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
          <Badge text="New" variant="blue" className="-mt-3" />
        </button>
        <button
          onClick={addTag}
          className="mr-2 rounded-md border border-gray-200 px-3 py-1 transition-all hover:border-gray-600 active:bg-gray-100"
        >
          <p className="text-sm text-gray-500">Add</p>
        </button>
      </div>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            className="mt-4 grid gap-2"
            {...SWIPE_REVEAL_ANIMATION_SETTINGS}
          >
            {tags?.length === 0 ? ( // if the project has no tags
              <p className="text-center text-sm text-gray-500">
                No tags yet.{" "}
                <button
                  className="font-medium underline underline-offset-4 transition-colors hover:text-black"
                  onClick={addTag}
                >
                  Add one.
                </button>
              </p>
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
                  className="relative flex cursor-pointer items-center space-x-3 rounded-md bg-gray-50 transition-all hover:bg-gray-100"
                >
                  <input
                    id={id}
                    name={id}
                    checked={router.query.tagId === id}
                    onChange={() => {
                      setQueryString(router, "tagId", id);
                    }}
                    type="radio"
                    className="ml-3 h-4 w-4 cursor-pointer rounded-full border-gray-300 text-black focus:outline-none focus:ring-0"
                  />
                  <label
                    htmlFor={id}
                    className="flex w-full cursor-pointer justify-between px-3 py-1.5 pl-0 text-sm font-medium text-gray-700"
                  >
                    <TagBadge name={name} color={color} />
                    <p className="text-gray-500">{nFormatter(count)}</p>
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

const MyLinksFilter = () => {
  const router = useRouter();
  const { userId } = router.query as { userId?: string };
  const { data: session } = useSession();

  return (
    <div className="flex items-center justify-between py-6">
      <label className="text-sm font-medium text-gray-600">
        Show my links only
      </label>
      <Switch
        fn={() =>
          // @ts-ignore
          setQueryString(router, "userId", userId ? "" : session?.user.id)
        }
        checked={userId ? true : false}
      />
    </div>
  );
};

const ArchiveFilter = () => {
  const router = useRouter();
  const { showArchived } = router.query as { showArchived?: string };

  return (
    <div className="flex items-center justify-between py-6">
      <label className="text-sm font-medium text-gray-600">
        Include archived links
      </label>
      <Switch
        fn={() =>
          // @ts-ignore
          setQueryString(router, "showArchived", showArchived ? "" : "true")
        }
        checked={showArchived ? true : false}
      />
    </div>
  );
};
