import useLinksCount from "@/lib/swr/use-links-count";
import useTags from "@/lib/swr/use-tags";
import useUsers from "@/lib/swr/use-users";
import { Avatar, BlurImage, Globe, Tag, User, useRouterStuff } from "@dub/ui";
import { GOOGLE_FAVICON_URL, nFormatter } from "@dub/utils";
import { useContext, useMemo } from "react";
import { LinksDisplayContext } from "./links-display-provider";
import TagBadge from "./tag-badge";

export function useLinkFilters() {
  const domains = useDomainFilterOptions();
  const tags = useTagFilterOptions();
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
        getOptionIcon: (value, props) => {
          const tagColor =
            props.option?.data?.color ??
            tags?.find(({ id }) => id === value)?.color;
          return tagColor ? (
            <TagBadge color={tagColor} withIcon className="sm:p-1" />
          ) : null;
        },
        options:
          tags?.map(({ id, name, color, count }) => ({
            value: id,
            icon: <TagBadge color={color} withIcon className="sm:p-1" />,
            label: name,
            data: { color },
            right: count,
          })) ?? null,
      },
      {
        key: "userId",
        icon: User,
        label: "Creator",
        options:
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

  return { filters, activeFilters, onSelect, onRemove, onRemoveAll };
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

function useTagFilterOptions() {
  const { tags } = useTags();
  const { showArchived } = useContext(LinksDisplayContext);

  const { data: tagsCount } = useLinksCount<
    {
      tagId: string;
      _count: number;
    }[]
  >({ groupBy: "tagId", showArchived });

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
        ?.map((user) => ({
          ...user,
          count:
            usersCount?.find(({ userId }) => userId === user.id)?._count || 0,
        }))
        .sort((a, b) => b.count - a.count) ?? null,
    [users, usersCount],
  );
}
