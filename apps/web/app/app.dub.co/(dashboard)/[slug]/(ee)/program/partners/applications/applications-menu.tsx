"use client";

import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { useApplicationSettingsModal } from "@/ui/modals/application-settings-modal";
import { useExportApplicationsModal } from "@/ui/modals/export-applications-modal";
import { ThreeDots } from "@/ui/shared/icons";
import { Button, Popover, useMediaQuery, UserXmark } from "@dub/ui";
import { Download } from "@dub/ui/icons";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ApplicationsMenu() {
  const router = useRouter();

  const { slug: workspaceSlug } = useWorkspace();
  const { program } = useProgram();

  const [isOpen, setIsOpen] = useState(false);

  const { setShowExportApplicationsModal, ExportApplicationsModal } =
    useExportApplicationsModal();

  const { setShowApplicationSettingsModal, ApplicationSettingsModal } =
    useApplicationSettingsModal();

  const { isMobile } = useMediaQuery();

  return (
    <>
      <ApplicationSettingsModal />
      <ExportApplicationsModal />
      <Button
        text={isMobile ? "Settings" : "Application settings"}
        onClick={() => setShowApplicationSettingsModal(true)}
        variant="secondary"
      />
      <Popover
        openPopover={isOpen}
        setOpenPopover={setIsOpen}
        content={
          <div className="grid w-full gap-px p-2 md:w-56">
            <button
              onClick={() => {
                router.push(
                  `/${workspaceSlug}/program/partners/applications/rejected`,
                );
                setIsOpen(false);
              }}
              className="w-full rounded-md p-2 hover:bg-neutral-100 active:bg-neutral-200"
            >
              <div className="flex items-center gap-2 text-left">
                <UserXmark className="size-4 shrink-0" />
                <span className="text-sm font-medium">
                  View rejected partners
                </span>
              </div>
            </button>

            <button
              onClick={() => {
                setShowExportApplicationsModal(true);
                setIsOpen(false);
              }}
              className="w-full rounded-md p-2 hover:bg-neutral-100 active:bg-neutral-200"
            >
              <div className="flex items-center gap-2 text-left">
                <Download className="size-4 shrink-0" />
                <span className="text-sm font-medium">Export as CSV</span>
              </div>
            </button>
          </div>
        }
        align="end"
      >
        <Button
          type="button"
          className="whitespace-nowrap px-2"
          variant="secondary"
          disabled={!program}
          icon={<ThreeDots className="size-4 shrink-0" />}
        />
      </Popover>
    </>
  );
}
