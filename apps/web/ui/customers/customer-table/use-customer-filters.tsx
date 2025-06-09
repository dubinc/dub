import useCustomersCount from "@/lib/swr/use-customers-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { LinkLogo, useRouterStuff } from "@dub/ui";
import { FlagWavy, Hyperlink } from "@dub/ui/icons";
import { COUNTRIES, getApexDomain, getPrettyUrl, nFormatter } from "@dub/utils";
import { useCallback, useMemo } from "react";

export function useCustomerFilters(
  extraSearchParams: Record<string, string>,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const { searchParamsObj, queryParams } = useRouterStuff();
  const { id: workspaceId, slug } = useWorkspace();

  const { data: countriesCount } = useCustomersCount<
    | {
        country: string;
        _count: number;
      }[]
    | undefined
  >({
    query: {
      groupBy: "country",
    },
    enabled,
  });

  const { data: linksCount } = useCustomersCount<
    | {
        linkId: string;
        shortLink: string;
        url: string;
        _count: number;
      }[]
    | undefined
  >({
    query: {
      groupBy: "linkId",
    },
    enabled,
  });

  const filters = useMemo(
    () => [
      {
        key: "country",
        icon: FlagWavy,
        label: "Country",
        getOptionIcon: (value) => (
          <img
            alt={value}
            src={`https://flag.vercel.app/m/${value}.svg`}
            className="h-2.5 w-4"
          />
        ),
        getOptionLabel: (value) => COUNTRIES[value],
        options:
          countriesCount
            ?.filter(({ country }) => COUNTRIES[country])
            .map(({ country, _count }) => ({
              value: country,
              label: COUNTRIES[country],
              right: nFormatter(_count, { full: true }),
              permalink: `/${slug}/analytics?event=leads&country=${country}`,
            })) ?? [],
        meta: {
          filterParams: ({ getValue }) => ({
            country: getValue(),
          }),
        },
      },
      {
        key: "linkId",
        icon: Hyperlink,
        label: "Link",
        getOptionIcon: (_value, props) => (
          <LinkLogo
            apexDomain={getApexDomain(props.option?.data?.url)}
            className="size-4 shrink-0 sm:size-4"
          />
        ),
        options:
          linksCount?.map(({ linkId, shortLink, url, _count }) => ({
            value: linkId,
            label: getPrettyUrl(shortLink),
            right: nFormatter(_count, { full: true }),
            permalink: `/${slug}/links/${getPrettyUrl(shortLink)}`,
            data: { url },
          })) ?? [],
        meta: {
          filterParams: ({ getValue }) => ({
            linkId: getValue(),
          }),
        },
      },
    ],
    [countriesCount, linksCount],
  );

  const activeFilters = useMemo(() => {
    const { country, linkId } = searchParamsObj;

    return [
      ...(country ? [{ key: "country", value: country }] : []),
      ...(linkId ? [{ key: "linkId", value: linkId }] : []),
    ];
  }, [searchParamsObj]);

  const onSelect = useCallback(
    (key: string, value: any) =>
      queryParams({
        set: {
          [key]: value,
        },
        del: "page",
      }),
    [queryParams],
  );

  const onRemove = useCallback(
    (key: string) =>
      queryParams({
        del: [key, "page"],
      }),
    [queryParams],
  );

  const onRemoveAll = useCallback(
    () =>
      queryParams({
        del: ["country", "search"],
      }),
    [queryParams],
  );

  const searchQuery = useMemo(
    () =>
      new URLSearchParams({
        ...Object.fromEntries(
          activeFilters.map(({ key, value }) => [key, value]),
        ),
        ...(searchParamsObj.search && { search: searchParamsObj.search }),
        workspaceId: workspaceId || "",
        ...extraSearchParams,
      }).toString(),
    [activeFilters, workspaceId, extraSearchParams],
  );

  const isFiltered = useMemo(
    () => activeFilters.length > 0 || searchParamsObj.search,
    [activeFilters, searchParamsObj.search],
  );

  return {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    searchQuery,
    isFiltered,
  };
}
