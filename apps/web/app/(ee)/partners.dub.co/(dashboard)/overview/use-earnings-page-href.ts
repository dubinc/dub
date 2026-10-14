import { useRouterStuff } from "@dub/ui";

// the All programs Earnings page, with the date range of the Overview page
export function useEarningsPageHref(
  params: { groupBy?: "linkId" | "programId" } = {},
) {
  const { searchParamsObj } = useRouterStuff();
  const { interval, start, end } = searchParamsObj;

  const query = new URLSearchParams(
    Object.entries({ ...params, interval, start, end }).filter(
      (entry): entry is [string, string] => Boolean(entry[1]),
    ),
  ).toString();

  return `/earnings${query ? `?${query}` : ""}`;
}
