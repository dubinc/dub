"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { UtmTemplateWithUserProps } from "@/lib/types";
import { useAddEditUtmTemplateModal } from "@/ui/modals/add-edit-utm-template.modal";
import EmptyState from "@/ui/shared/empty-state";
import { CardList } from "@dub/ui";
import { DiamondTurnRight } from "@dub/ui/src";
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
    workspaceId && `/api/utm-templates?workspaceId=${workspaceId}`,
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
        <div className="flex justify-end gap-6">
          <AddUtmTemplateButton />
        </div>
        {workspaceId && <AddEditUtmTemplateModal />}

        {isLoading || templates?.length ? (
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
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 py-10">
            <EmptyState
              icon={DiamondTurnRight}
              title="No templates found for this workspace"
            />
            <AddUtmTemplateButton />
          </div>
        )}
      </div>
    </>
  );
}
