"use client";

import useWorkspaces from "@/lib/swr/use-workspaces";
import { Button } from "@dub/ui";
import { TooltipContent } from "@dub/ui/src/tooltip";
import { FREE_WORKSPACES_LIMIT } from "@dub/utils";
import { pushModal } from "../modals";

export default function CreateWorkspaceButton() {
  const { freeWorkspaces, exceedingFreeWorkspaces } = useWorkspaces();

  return (
    <div>
      <Button
        text="Create workspace"
        disabledTooltip={
          exceedingFreeWorkspaces ? (
            <TooltipContent
              title={`You can only create up to ${FREE_WORKSPACES_LIMIT} free workspaces. Additional workspaces require a paid plan.`}
              cta="Upgrade to Pro"
              href={
                freeWorkspaces
                  ? `/${freeWorkspaces[0].slug}/settings/billing?upgrade=pro`
                  : "https://dub.co/pricing"
              }
            />
          ) : undefined
        }
        className="flex-shrink-0 truncate"
        onClick={() => pushModal("AddWorkspace")}
      />
    </div>
  );
}
