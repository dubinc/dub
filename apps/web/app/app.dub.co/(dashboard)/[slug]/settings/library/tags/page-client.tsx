"use client";

import useLinksCount from "@/lib/swr/use-links-count";
import useTags from "@/lib/swr/use-tags";
import useTagsCount from "@/lib/swr/use-tags-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { TAGS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/tags";
import { useAddEditTagModal } from "@/ui/modals/add-edit-tag-modal";
import EmptyState from "@/ui/shared/empty-state";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import { PaginationControls } from "@dub/blocks";
import { CardList, usePagination, useRouterStuff } from "@dub/ui";
import { Tag } from "@dub/ui/src/icons";
import { Dispatch, SetStateAction, createContext, useState } from "react";
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

  const [openMenuTagId, setOpenMenuTagId] = useState<string | null>(null);

  return (
    <>
      <div className="grid gap-4 pb-10">
        <div className="flex w-full flex-wrap items-center justify-between gap-3 gap-6 sm:w-auto">
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
        </div>
        {workspaceId && <AddEditTagModal />}

        {loading || tags?.length ? (
          <TagsListContext.Provider value={{ openMenuTagId, setOpenMenuTagId }}>
            <CardList variant="compact" loading={loading}>
              {tags?.length
                ? tags.map((tag) => (
                    <TagCard key={tag.id} tag={tag} tagsCount={tagLinksCount} />
                  ))
                : Array.from({ length: 6 }).map((_, idx) => (
                    <TagCardPlaceholder key={idx} />
                  ))}
            </CardList>
          </TagsListContext.Provider>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 py-10">
            <EmptyState icon={Tag} title="No tags found for this workspace" />
            <AddTagButton />
          </div>
        )}

        <div className="sticky bottom-0 rounded-b-[inherit] border-t border-gray-200 bg-white px-3.5 py-2">
          <PaginationControls
            pagination={pagination}
            setPagination={setPagination}
            totalCount={tagsCount || 0}
            unit={(p) => `tag${p ? "s" : ""}`}
          />
        </div>
      </div>
    </>
  );
}
