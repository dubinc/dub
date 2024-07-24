import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function useRouterStuff() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsObj = Object.fromEntries(searchParams);

  const getQueryString = (
    kv?: Record<string, any>,
    opts?: {
      ignore?: string[];
    },
  ) => {
    const newParams = new URLSearchParams(searchParams);
    if (kv) {
      Object.entries(kv).forEach(([k, v]) => newParams.set(k, v));
    }
    if (opts?.ignore) {
      opts.ignore.forEach((k) => newParams.delete(k));
    }
    const queryString = newParams.toString();
    return queryString.length > 0 ? `?${queryString}` : "";
  };

  const queryParams = ({
    set,
    del,
    replace,
    getNewPath,
    arrayDelimiter = ",",
  }: {
    set?: Record<string, string | string[]>;
    del?: string | string[];
    replace?: boolean;
    getNewPath?: boolean;
    arrayDelimiter?: string;
  }) => {
    const newParams = new URLSearchParams(searchParams);
    if (set) {
      Object.entries(set).forEach(([k, v]) =>
        newParams.set(k, Array.isArray(v) ? v.join(arrayDelimiter) : v),
      );
    }
    if (del) {
      if (Array.isArray(del)) {
        del.forEach((k) => newParams.delete(k));
      } else {
        newParams.delete(del);
      }
    }
    const queryString = newParams.toString();
    const newPath = `${pathname}${
      queryString.length > 0 ? `?${queryString}` : ""
    }`;
    if (getNewPath) return newPath;
    if (replace) {
      router.replace(newPath, { scroll: false });
    } else {
      router.push(newPath);
    }
  };

  return {
    pathname,
    router,
    searchParams,
    searchParamsObj,
    queryParams,
    getQueryString,
  };
}
