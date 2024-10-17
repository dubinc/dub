"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { UtmTemplateWithUserProps } from "@/lib/types";
import { useAddEditUtmTemplateModal } from "@/ui/modals/add-edit-utm-template.modal";
import { CardList } from "@dub/ui";
import { DiamondTurnRight, Flag6, GlobePointer } from "@dub/ui/src";
import { fetcher } from "@dub/utils";
import {
  Dispatch,
  SetStateAction,
  createContext,
  useEffect,
  useState,
} from "react";
import useSWR from "swr";
import { LibraryEmptyState } from "../library-empty-state";
import { TemplateCard } from "./template-card";
import { TemplateCardPlaceholder } from "./template-card-placeholder";

export const TemplatesListContext = createContext<{
  openMenuTemplateId: string | null;
  setOpenMenuTemplateId: Dispatch<SetStateAction<string | null>>;
}>({
  openMenuTemplateId: null,
  setOpenMenuTemplateId: () => {},
});

export default function WorkspaceUtmTemplatesClient() {
  const { id: workspaceId } = useWorkspace();

  const { data: templates, isLoading } = useSWR<UtmTemplateWithUserProps[]>(
    workspaceId && `/api/utm?workspaceId=${workspaceId}`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  // Whether the initial tags have already loaded, for some loading states like the search box
  const [initiallyLoaded, setInitiallyLoaded] = useState(false);
  useEffect(() => {
    if (!isLoading && templates) setInitiallyLoaded(true);
  }, [templates, isLoading]);

  const [openMenuTemplateId, setOpenMenuTemplateId] = useState<string | null>(
    null,
  );

  const { AddEditUtmTemplateModal, AddUtmTemplateButton } =
    useAddEditUtmTemplateModal();

  return (
    <>
      <div className="grid gap-4">
        {workspaceId && <AddEditUtmTemplateModal />}

        {isLoading || templates?.length ? (
          <>
            <div className="flex justify-end gap-6">
              {initiallyLoaded ? (
                <AddUtmTemplateButton />
              ) : (
                <div className="h-9 w-32 animate-pulse rounded-md bg-gray-100" />
              )}
            </div>
            <TemplatesListContext.Provider
              value={{ openMenuTemplateId, setOpenMenuTemplateId }}
            >
              <CardList variant="compact" loading={isLoading}>
                {templates?.length
                  ? templates.map((template) => (
                      <TemplateCard key={template.id} template={template} />
                    ))
                  : Array.from({ length: 6 }).map((_, idx) => (
                      <TemplateCardPlaceholder key={idx} />
                    ))}
              </CardList>
            </TemplatesListContext.Provider>
          </>
        ) : (
          <LibraryEmptyState
            title="No UTM Templates"
            description="Create templates for quicker link tracking"
            cardContent={
              <>
                <DiamondTurnRight className="size-4 text-neutral-700" />
                <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
                <div className="hidden grow items-center justify-end gap-1.5 text-gray-500 sm:flex">
                  <GlobePointer className="size-3.5" />
                  <Flag6 className="size-3.5" />
                </div>
              </>
            }
            addButton={<AddUtmTemplateButton />}
            learnMoreHref="https://dub.co/help/article/utm-builder" // TODO: Update with template-specific link
          />
        )}
      </div>
    </>
  );
}
