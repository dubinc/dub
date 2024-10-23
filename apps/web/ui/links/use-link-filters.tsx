import useLinksCount from "@/lib/swr/use-links-count";
import useTags from "@/lib/swr/use-tags";
import useTagsCount from "@/lib/swr/use-tags-count";
import useUsers from "@/lib/swr/use-users";
import { TagProps } from "@/lib/types";
import { TAGS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/tags";
import { Avatar, BlurImage, Globe, Tag, User, useRouterStuff } from "@dub/ui";
import { GOOGLE_FAVICON_URL, nFormatter } from "@dub/utils";
import { useContext, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import { LinksDisplayContext } from "./links-display-provider";
import TagBadge from "./tag-badge";

export function useLinkFilters() {
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const domains = useDomainFilterOptions();
  const { tags, tagsAsync } = useTagFilterOptions(
    selectedFilter === "tagIds" ? debouncedSearch : "",
  );
  const users = useUserFilterOptions();

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
          right: nFormatter(count, { full: true }),
        })),
      },
      {
        key: "tagIds",
        icon: Tag,
        label: "Tag",
        multiple: true,
        shouldFilter: !tagsAsync,
        getOptionIcon: (value, props) => {
          const tagColor =
            props.option?.data?.color ??
            tags?.find(({ id }) => id === value)?.color;
          return tagColor ? (
            <TagBadge color={tagColor} withIcon className="sm:p-1" />
          ) : null;
        },
        options:
          tags?.map(({ id, name, color, count, hideDuringSearch }) => ({
            value: id,
            icon: <TagBadge color={color} withIcon className="sm:p-1" />,
            label: name,
            data: { color },
            right: count,
            hideDuringSearch,
          })) ?? null,
      },
      {
        key: "userId",
        icon: User,
        label: "Creator",
        options:
          // @ts-expect-error
          users?.map(({ id, name, email, image, count }) => ({
            value: id,
            label: name || email,
            icon: (
              <Avatar
                user={{
                  id,
                  name,
                  image,
                }}
                className="h-4 w-4"
              />
            ),
            right: count,
          })) ?? null,
      },
    ];
  }, [domains, tags, users]);

  const selectedTagIds = useMemo(
    () => searchParamsObj["tagIds"]?.split(",")?.filter(Boolean) ?? [],
    [searchParamsObj],
  );

  const activeFilters = useMemo(() => {
    const { domain, tagIds, userId } = searchParamsObj;
    return [
      ...(domain ? [{ key: "domain", value: domain }] : []),
      ...(tagIds ? [{ key: "tagIds", value: selectedTagIds }] : []),
      ...(userId ? [{ key: "userId", value: userId }] : []),
    ];
  }, [searchParamsObj]);

  const onSelect = (key: string, value: any) => {
    if (key === "tagIds") {
      queryParams({
        set: {
          tagIds: selectedTagIds.concat(value).join(","),
        },
        del: "page",
      });
    } else {
      queryParams({
        set: {
          [key]: value,
        },
        del: "page",
      });
    }
  };

  const onRemove = (key: string, value: any) => {
    if (
      key === "tagIds" &&
      !(selectedTagIds.length === 1 && selectedTagIds[0] === value)
    ) {
      queryParams({
        set: {
          tagIds: selectedTagIds.filter((id) => id !== value).join(","),
        },
        del: "page",
      });
    } else {
      queryParams({
        del: [key, "page"],
      });
    }
  };

  const onRemoveAll = () => {
    queryParams({
      del: ["domain", "tagIds", "userId", "search"],
    });
  };

  return {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    setSearch,
    setSelectedFilter,
  };
}

function useDomainFilterOptions() {
  const { showArchived } = useContext(LinksDisplayContext);

  const { data: domainsCount } = useLinksCount<
    {
      domain: string;
      _count: number;
    }[]
  >({
    groupBy: "domain",
    showArchived,
  });

  return useMemo(() => {
    if (!domainsCount || domainsCount.length === 0) return [];

    return domainsCount
      .map(({ domain, _count }) => ({
        slug: domain,
        count: _count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [domainsCount]);
}

function useTagFilterOptions(search: string) {
  const { searchParamsObj } = useRouterStuff();

  const tagIds = useMemo(
    () => searchParamsObj.tagIds?.split(",")?.filter(Boolean) ?? [],
    [searchParamsObj.tagIds],
  );

  const { data: tagsCount } = useTagsCount();
  const tagsAsync = Boolean(tagsCount && tagsCount > TAGS_MAX_PAGE_SIZE);
  const { tags, loading: loadingTags } = useTags({
    query: { search: tagsAsync ? search : "" },
  });

  const { tags: selectedTags } = useTags({
    query: { ids: tagIds },
    enabled: tagsAsync,
  });
  const { showArchived } = useContext(LinksDisplayContext);

  const { data: tagLinksCount } = useLinksCount<
    {
      tagId: string;
      _count: number;
    }[]
  >({ groupBy: "tagId", showArchived });

  const tagsResult = useMemo(() => {
    return loadingTags ||
      // Consider tags loading if we can't find the currently filtered tag
      (tagIds?.length &&
        tagIds.some(
          (id) =>
            ![...(selectedTags ?? []), ...(tags ?? [])].some(
              (t) => t.id === id,
            ),
        ))
      ? null
      : (
          [
            ...(tags ?? []),
            // Add selected tag to list if not already in tags
            ...(selectedTags
              ?.filter((st) => !tags?.some((t) => t.id === st.id))
              ?.map((st) => ({ ...st, hideDuringSearch: true })) ?? []),
          ] as (TagProps & { hideDuringSearch?: boolean })[]
        )
          ?.map((tag) => ({
            ...tag,
            count:
              tagLinksCount?.find(({ tagId }) => tagId === tag.id)?._count || 0,
          }))
          .sort((a, b) => b.count - a.count) ?? null;
  }, [loadingTags, tags, selectedTags, tagLinksCount, tagIds]);

  return { tags: tagsResult, tagsAsync };
}

function useUserFilterOptions() {
  const { users } = useUsers();
  const { showArchived } = useContext(LinksDisplayContext);

  const { data: usersCount } = useLinksCount<
    {
      userId: string;
      _count: number;
    }[]
  >({
    groupBy: "userId",
    showArchived,
  });

  return useMemo(
    () =>
      users
        ? users
            .map((user) => ({
              ...user,
              count:
                usersCount?.find(({ userId }) => userId === user.id)?._count ||
                0,
            }))
            .sort((a, b) => b.count - a.count)
        : usersCount
          ? usersCount.map(({ userId, _count }) => ({
              id: userId,
              name: userId,
              count: _count,
            }))
          : null,
    [users, usersCount],
  );
}
