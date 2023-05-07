import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { nFormatter, setQueryString } from "@/lib/utils";
import { ChevronRight, XCircle, Search } from "lucide-react";
import useDomains from "@/lib/swr/use-domains";
import { AnimatePresence, motion } from "framer-motion";
import { SWIPE_REVEAL_ANIMATION_SETTINGS } from "@/lib/constants";
import { useDebouncedCallback } from "use-debounce";
import Link from "next/link";
import useLinks from "@/lib/swr/use-links";
import { LoadingSpinner } from "#/ui/icons";
import useLinksCount from "@/lib/swr/use-links-count";
import punycode from "punycode/";
import Switch from "#/ui/switch";
import { useSession } from "next-auth/react";

export default function LinkFilters() {
  const { primaryDomain } = useDomains();
  const { data: domains } = useLinksCount({ groupBy: "domain" });
  const router = useRouter();
  const { slug, search, domain, userId } = router.query as {
    slug: string;
    search?: string;
    domain?: string;
    userId?: string;
  };
  const searchInputRef = useRef(); // this is a hack to clear the search input when the clear button is clicked

  return domains ? (
    <div className="grid w-full rounded-md bg-white px-5 lg:divide-y lg:divide-gray-300">
      <div className="grid gap-3 py-6">
        <div className="flex items-center justify-between">
          <h3 className="ml-1 mt-2 font-semibold">Filter Links</h3>
          {(search || domain || userId) && (
            <ClearButton searchInputRef={searchInputRef} />
          )}
        </div>
        <SearchBox searchInputRef={searchInputRef} />
      </div>
      {slug && <MyLinksFilter />}
      <FilterGroup
        param="domain"
        options={
          domains.length === 0
            ? [{ value: primaryDomain || "", count: 0 }]
            : domains.map(({ domain, _count }) => ({
                value: domain,
                count: _count,
              }))
        }
        cta={{
          type: "link",
          text: "Add a domain",
          href: `/${slug}/domains`,
        }}
      />
    </div>
  ) : (
    <div className="grid h-full gap-6 rounded-md bg-white p-5">
      <div className="h-[300px] w-full animate-pulse rounded-md bg-gray-200" />
    </div>
  );
}
const SearchBox = ({ searchInputRef }: { searchInputRef }) => {
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

const FilterGroup = ({
  param,
  options,
  cta,
}: {
  param: string;
  options: { value: string; count: number }[];
  cta: {
    type: "link" | "button";
    text: string;
    href?: string;
    action?: () => void;
  };
}) => {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <fieldset className="py-6">
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
          <h4 className="font-medium capitalize text-gray-900">{param}</h4>
        </button>
      </div>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            className="mt-4 grid gap-2"
            {...SWIPE_REVEAL_ANIMATION_SETTINGS}
          >
            {options?.map(({ value, count }) => (
              <div
                key={value}
                className="relative flex cursor-pointer items-center space-x-3 rounded-md bg-gray-50 transition-all hover:bg-gray-100"
              >
                <input
                  id={value}
                  name={value}
                  checked={
                    router.query[param] === value || options.length === 1
                  }
                  onChange={() => {
                    setQueryString(router, param, value);
                  }}
                  type="radio"
                  className="ml-3 h-4 w-4 cursor-pointer rounded-full border-gray-300 text-black focus:outline-none focus:ring-0"
                />
                <label
                  htmlFor={value}
                  className="flex w-full cursor-pointer justify-between px-3 py-2 pl-0 text-sm font-medium text-gray-700"
                >
                  <p>{punycode.toUnicode(value || "")}</p>
                  <p className="text-gray-500">{nFormatter(count)}</p>
                </label>
              </div>
            ))}
            {router.query.slug && cta.href && (
              <Link
                href={cta.href}
                className="rounded-md border border-gray-300 p-1 text-center text-sm"
              >
                {cta.text}
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </fieldset>
  );
};

const ClearButton = ({ searchInputRef }: { searchInputRef }) => {
  const router = useRouter();
  const { slug } = router.query;
  return (
    <button
      onClick={() => {
        router.replace(`/${slug || "links"}`).then(() => {
          searchInputRef.current.value = "";
        });
      }}
      className="group flex items-center justify-center space-x-1 rounded-md border border-gray-500 px-2 py-1 transition-all hover:border-black"
    >
      <XCircle className="h-4 w-4 text-gray-500 transition-all group-hover:text-black" />
      <p className="text-sm text-gray-500 transition-all group-hover:text-black">
        Clear
      </p>
    </button>
  );
};
