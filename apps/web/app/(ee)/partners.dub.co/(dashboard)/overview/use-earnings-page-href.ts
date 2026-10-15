import { useRouterStuff } from "@dub/ui";

// the All programs Earnings page, with the date range of the Overview page
export function useEarningsPageHref(params: { groupBy?: "linkId" } = {}) {
  const { getQueryString } = useRouterStuff();

  return `/earnings${getQueryString(params, {
    include: ["interval", "start", "end"],
  })}`;
}
