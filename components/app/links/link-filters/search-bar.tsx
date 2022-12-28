import { useRouter } from "next/router";
import useSWR from "swr";
import { fetcher, getQueryString } from "@/lib/utils";
import { useDebounce } from "use-debounce";
import { LinkProps } from "@/lib/types";
import { LoadingSpinner, Search } from "@/components/shared/icons";
import { useState } from "react";

export default function SearchBar() {
  const router = useRouter();
  const { slug } = router.query as {
    slug: string;
  };
  const { search } = router.query as { page?: string; search?: string };
  const { isValidating } = useSWR<LinkProps[]>(
    slug
      ? `/api/projects/${slug}/links${getQueryString(router)}`
      : `/api/links${getQueryString(router)}`,
    fetcher,
    {
      // disable this because it keeps refreshing the state of the modal when its open
      revalidateOnFocus: false,
    },
  );
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative mx-2 mt-10 rounded-md shadow-sm sm:max-w-screen-lg lg:mx-auto">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
        {focused && search && isValidating ? (
          <LoadingSpinner />
        ) : (
          <Search className="h-5 w-5 text-gray-400" />
        )}
      </div>
      <input
        type="text"
        name="search"
        autoComplete="off"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        value={search || ""}
        onChange={(e) => {
          if (e.target.value === "") {
            delete router.query.search;
            router.replace(
              {
                query: {
                  ...router.query,
                },
              },
              undefined,
              { shallow: true },
            );
          } else {
            router.replace(
              {
                query: {
                  ...router.query,
                  search: e.target.value,
                },
              },
              undefined,
              { shallow: true },
            );
          }
        }}
        className="block h-11 w-full rounded-md border-gray-200 pl-11 text-sm text-gray-600 transition-all placeholder:text-gray-400 focus:border-black focus:ring-0"
        placeholder="Search..."
      />
    </div>
  );
}
