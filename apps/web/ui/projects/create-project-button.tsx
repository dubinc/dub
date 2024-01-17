"use client";

import useProjects from "@/lib/swr/use-projects";
import { ModalContext } from "@/ui/modals/provider";
import { Button } from "@dub/ui";
import { TooltipContent } from "@dub/ui/src/tooltip";
import { HOME_DOMAIN } from "@dub/utils";
import { useContext } from "react";

export default function CreateProjectButton() {
  const { setShowAddProjectModal } = useContext(ModalContext);
  const { freeProjects, exceedingFreeProjects } = useProjects();

  return (
    <div>
      <Button
        text="Create project"
        disabledTooltip={
          exceedingFreeProjects ? (
            <TooltipContent
              title="You can only create one free project. Additional projects require a paid plan."
              cta="Upgrade to Pro"
              href={
                freeProjects
                  ? `/${freeProjects[0].slug}/settings/billing?upgrade=pro`
                  : `${HOME_DOMAIN}/pricing`
              }
            />
          ) : undefined
        }
        onClick={() => setShowAddProjectModal(true)}
      />
    </div>
  );
}
