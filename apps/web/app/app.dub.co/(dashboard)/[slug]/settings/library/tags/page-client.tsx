"use client";

import useLinksCount from "@/lib/swr/use-links-count";
import useTags from "@/lib/swr/use-tags";
import useTagsCount from "@/lib/swr/use-tags-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { TAGS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/tags";
import { useAddEditTagModal } from "@/ui/modals/add-edit-tag-modal";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import { PaginationControls } from "@dub/blocks";
import { CardList, Tag, usePagination, useRouterStuff } from "@dub/ui";
import {
  createContext,
  Dispatch,
  SetStateAction,
  useEffect,
  useState,
} from "react";
import { LibraryEmptyState } from "../library-empty-state";
import { TagCard } from "./tag-card";
import { TagCardPlaceholder } from "./tag-card-placeholder";

export const TagsListContext = createContext<{
  openMenuTagId: string | null;
  setOpenMenuTagId: Dispatch<SetStateAction<string | null>>;
}>({
  openMenuTagId: null,
  setOpenMenuTagId: () => {},
});

export default function WorkspaceTagsClient() {
  const { searchParams, queryParams } = useRouterStuff();
  const { id: workspaceId } = useWorkspace();

  const { AddEditTagModal, AddTagButton } = useAddEditTagModal();

  const search = searchParams.get("search");
  const { pagination, setPagination } = usePagination(TAGS_MAX_PAGE_SIZE);

  const { tags, loading } = useTags({
    query: { search: search ?? "", page: pagination.pageIndex },
  });
  const { data: tagsCount } = useTagsCount({
    query: { search: search ?? "" },
  });
  const { data: tagLinksCount } = useLinksCount<
    {
      tagId: string;
      _count: number;
    }[]
  >({
    groupBy: "tagId",
    showArchived: true,
  });

  // Whether the initial tags have already loaded, for some loading states like the search box
  const [initiallyLoaded, setInitiallyLoaded] = useState(false);
  useEffect(() => {
    if (!loading && tags) setInitiallyLoaded(true);
  }, [tags, loading]);

  const [openMenuTagId, setOpenMenuTagId] = useState<string | null>(null);

  return (
    <>
      <div className="grid gap-4 pb-10">
        {workspaceId && <AddEditTagModal />}
        {loading || tags?.length ? (
          <>
            <div className="flex w-full flex-wrap items-center justify-between gap-3 gap-6 sm:w-auto">
              {initiallyLoaded ? (
                <>
                  <SearchBoxPersisted
                    loading={loading}
                    onChangeDebounced={(t) => {
                      if (t) {
                        queryParams({ set: { search: t }, del: "page" });
                      } else {
                        queryParams({ del: "search" });
                      }
                    }}
                  />
                  <AddTagButton />
                </>
              ) : (
                <>
                  <div className="h-[38px] w-20 animate-pulse rounded-md bg-gray-100 md:w-60" />
                  <div className="h-9 w-24 animate-pulse rounded-md bg-gray-100" />
                </>
              )}
            </div>

            <TagsListContext.Provider
              value={{ openMenuTagId, setOpenMenuTagId }}
            >
              <CardList variant="compact" loading={loading}>
                {tags?.length
                  ? tags.map((tag) => (
                      <TagCard
                        key={tag.id}
                        tag={tag}
                        tagsCount={tagLinksCount}
                      />
                    ))
                  : Array.from({ length: 6 }).map((_, idx) => (
                      <TagCardPlaceholder key={idx} />
                    ))}
              </CardList>
            </TagsListContext.Provider>
            {initiallyLoaded && (
              <div className="sticky bottom-0 rounded-b-[inherit] border-t border-gray-200 bg-white px-3.5 py-2">
                <PaginationControls
                  pagination={pagination}
                  setPagination={setPagination}
                  totalCount={tagsCount || 0}
                  unit={(p) => `tag${p ? "s" : ""}`}
                />
              </div>
            )}
          </>
        ) : (
          <LibraryEmptyState
            title="No tags found"
            description="Create tags to organize your links"
            cardContent={
              <>
                <div className="flex size-7 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50">
                  <Tag className="size-4 text-neutral-700" />
                </div>
                <div className="h-2.5 w-28 min-w-0 rounded-sm bg-neutral-200" />
              </>
            }
            addButton={<AddTagButton />}
            learnMoreHref="https://dub.co/help/article/how-to-use-tags"
          />
        )}
      </div>
    </>
  );
}
