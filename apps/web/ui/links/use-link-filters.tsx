import useDomains from "@/lib/swr/use-domains";
import useLinksCount from "@/lib/swr/use-links-count";
import useTags from "@/lib/swr/use-tags";
import useUser from "@/lib/swr/use-user";
import useWorkspace from "@/lib/swr/use-workspace";
import { BlurImage, Globe, Tag, User, useRouterStuff } from "@dub/ui";
import { DUB_WORKSPACE_ID, GOOGLE_FAVICON_URL, cn } from "@dub/utils";
import { useMemo } from "react";
import { COLORS_LIST } from "./tag-badge";

export function useLinkFilters() {
  const domains = useDomainFilterOptions();
  const tags = useTagFilterOptions();
  const { user } = useUser();

  const { queryParams, searchParamsObj } = useRouterStuff();

  const filters = useMemo(() => {
    return [
      {
        key: "domain",
        icon: Globe,
        label: "Domain",
        getOptionIcon: (value) => (
          <BlurImage
            src={`${GOOGLE_FAVICON_URL}${value}`}
            alt={value}
            className="h-4 w-4 rounded-full"
            width={16}
            height={16}
          />
        ),
        options: domains.map(({ slug, count }) => ({
          value: slug,
          label: slug,
          right: count,
        })),
      },
      {
        key: "tagId",
        icon: Tag,
        label: "Tag",
        getOptionIcon: (value, props) => {
          const tagColor =
            props.option?.data?.color ??
            tags?.find(({ id }) => id === value)?.color;
          return tagColor ? (
            <div
              className={cn(
                "rounded-md p-1.5",
                COLORS_LIST.find(({ color }) => color === tagColor)?.css,
              )}
            >
              <Tag className="h-2.5 w-2.5" />
            </div>
          ) : null;
        },
        options:
          tags?.map(({ id, name, color, count }) => ({
            value: id,
            icon: (
              <div
                className={cn(
                  "rounded-md p-1.5",
                  COLORS_LIST.find((c) => c.color === color)?.css,
                )}
              >
                <Tag className="h-2.5 w-2.5" />
              </div>
            ),
            label: name,
            data: { color },
            right: count,
          })) ?? null,
      },
      ...(user?.id
        ? [
            {
              key: "userId",
              icon: User,
              label: "Creator",
              options: [
                {
                  value: user?.id,
                  label: "Me",
                },
              ],
            },
          ]
        : []),
    ];
  }, [domains, tags]);

  const activeFilters = useMemo(() => {
    const { domain, tagId, userId } = searchParamsObj;
    return [
      ...(domain ? [{ key: "domain", value: domain }] : []),
      ...(tagId ? [{ key: "tagId", value: tagId }] : []),
      ...(userId ? [{ key: "userId", value: userId }] : []),
    ];
  }, [searchParamsObj]);

  const onSelect = (key: string, value: any) => {
    queryParams({
      set: {
        [key]: value,
      },
    });
  };

  const onRemove = (key: string) => {
    queryParams({
      del: key,
    });
  };

  const onRemoveAll = () => {
    queryParams({
      del: ["domain", "tagId", "userId", "search"],
    });
  };

  return { filters, activeFilters, onSelect, onRemove, onRemoveAll };
}

function useDomainFilterOptions() {
  const { id: workspaceId } = useWorkspace();
  const { data: domains } = useLinksCount({ groupBy: "domain" });
  const { activeWorkspaceDomains, activeDefaultDomains } = useDomains();

  return useMemo(() => {
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
}

function useTagFilterOptions() {
  const { tags } = useTags();
  const { data: tagsCount } = useLinksCount({ groupBy: "tagId" });

  return useMemo(
    () =>
      tags
        ?.map((tag) => ({
          ...tag,
          count: tagsCount?.find(({ tagId }) => tagId === tag.id)?._count || 0,
        }))
        .sort((a, b) => b.count - a.count) ?? null,
    [tags, tagsCount],
  );
}
