"use client";

import useWorkspaces from "@/lib/swr/use-workspaces";
import { ModalContext } from "@/ui/modals/provider";
import { Button } from "@dub/ui";
import { TooltipContent } from "@dub/ui/src/tooltip";
import { FREE_PROJECTS_LIMIT, HOME_DOMAIN } from "@dub/utils";
import { useContext } from "react";

export default function CreateWorkspaceButton() {
  const { setShowAddWorkspaceModal } = useContext(ModalContext);
  const { freeWorkspces, exceedingFreeWorkspces } = useWorkspaces();

  return (
    <div>
      <Button
        text="Create workspace"
        disabledTooltip={
          exceedingFreeWorkspces ? (
            <TooltipContent
              title={`You can only create up to ${FREE_PROJECTS_LIMIT} free workspaces. Additional workspaces require a paid plan.`}
              cta="Upgrade to Pro"
              href={
                freeWorkspces
                  ? `/${freeWorkspces[0].slug}/settings/billing?upgrade=pro`
                  : `${HOME_DOMAIN}/pricing`
              }
            />
          ) : undefined
        }
        onClick={() => setShowAddWorkspaceModal(true)}
      />
    </div>
  );
}
