import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  ReadonlyURLSearchParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

export function useRouterStuff() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsObj = Object.fromEntries(searchParams);

  const getQueryString = (
    kv?: Record<string, any>,
    opts?: {
      include?: string[];
      exclude?: string[];
    },
  ) => {
    const newParams = new URLSearchParams(searchParams);
    if (kv) {
      Object.entries(kv).forEach(([k, v]) => newParams.set(k, v));
    }
    if (opts?.include && Array.isArray(opts.include)) {
      newParams.forEach((_value, key) => {
        if (!opts?.include?.includes(key)) {
          newParams.delete(key);
        }
      });
    }
    if (opts?.exclude && Array.isArray(opts.exclude)) {
      opts.exclude.forEach((k) => newParams.delete(k));
    }
    const queryString = newParams.toString();
    return queryString.length > 0 ? `?${queryString}` : "";
  };

  const queryParams = ({
    set,
    del,
    replace,
    scroll = true,
    getNewPath,
    arrayDelimiter = ",",
  }: {
    set?: Record<string, string | string[]>;
    del?: string | string[];
    replace?: boolean;
    scroll?: boolean;
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
      router.push(newPath, { scroll });
    }
  };

  return {
    pathname: pathname as string,
    router: router as AppRouterInstance,
    searchParams: searchParams as ReadonlyURLSearchParams,
    searchParamsObj,
    queryParams,
    getQueryString,
  };
}
