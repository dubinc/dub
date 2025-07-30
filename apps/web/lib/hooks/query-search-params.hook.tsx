import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useCallback } from "react";

// query search params hook
export const useQuerySearchParams = () => {
  const { push } = useRouter();

  const pathname = usePathname();
  const searchParams = useSearchParams();

  const hash = typeof window !== "undefined" ? window.location.hash : "";
  const hashParams = new URLSearchParams(hash.slice(1));

  const createQuery = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams);
      params.delete("page");

      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }

      return params.toString();
    },
    [searchParams],
  );

  const changeQuery = (name: string, value: string) => {
    push(pathname + "?" + createQuery(name, value));
  };

  const allQueriesParams = String(new URLSearchParams(searchParams));

  // return
  return { push, searchParams, allQueriesParams, changeQuery, hashParams };
};
