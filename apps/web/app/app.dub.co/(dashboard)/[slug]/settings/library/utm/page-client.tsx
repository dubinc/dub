"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { UtmTemplateWithUserProps } from "@/lib/types";
import { useAddEditUtmTemplateModal } from "@/ui/modals/add-edit-utm-template.modal";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { CardList, DiamondTurnRight, Flag6, GlobePointer } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { Dispatch, SetStateAction, createContext, useState } from "react";
import useSWR from "swr";
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
              <AddUtmTemplateButton />
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
          <AnimatedEmptyState
            className="mt-6"
            title="No UTM Templates Found"
            description="Create shared templates to streamline UTM campaign management across your team"
            cardContent={
              <>
                <DiamondTurnRight className="size-4 text-neutral-700" />
                <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
                <div className="hidden grow items-center justify-end gap-1.5 text-neutral-500 sm:flex">
                  <GlobePointer className="size-3.5" />
                  <Flag6 className="size-3.5" />
                </div>
              </>
            }
            addButton={<AddUtmTemplateButton />}
            learnMoreHref="https://dub.co/help/article/how-to-create-utm-templates"
          />
        )}
      </div>
    </>
  );
}
