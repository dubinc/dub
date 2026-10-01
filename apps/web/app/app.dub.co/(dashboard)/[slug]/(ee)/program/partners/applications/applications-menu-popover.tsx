"use client";

import useProgram from "@/lib/swr/use-program";
import { useApplicationSettingsModal } from "@/ui/modals/application-settings-modal";
import { useExportApplicationsModal } from "@/ui/modals/export-applications-modal";
import { ThreeDots } from "@/ui/shared/icons";
import { Button, Download, IconMenu, Popover, useMediaQuery } from "@dub/ui";
import { useState } from "react";

export function ApplicationSettingsButton() {
  const { isMobile } = useMediaQuery();

  const { setShowApplicationSettingsModal, ApplicationSettingsModal } =
    useApplicationSettingsModal();

  return (
    <>
      <ApplicationSettingsModal />
      <Button
        text={isMobile ? "Settings" : "Application settings"}
        onClick={() => setShowApplicationSettingsModal(true)}
        variant="secondary"
      />
    </>
  );
}

export function ApplicationsMenuPopover() {
  const { program } = useProgram();
  const [openPopover, setOpenPopover] = useState(false);

  const { setShowExportApplicationsModal, ExportApplicationsModal } =
    useExportApplicationsModal();

  return (
    <>
      <ExportApplicationsModal />
      <Popover
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}
        content={
          <div className="w-full md:w-52">
            <div className="grid gap-px p-2">
              <p className="mb-1.5 mt-1 flex items-center gap-2 px-1 text-xs font-medium text-neutral-500">
                Export Applications
              </p>
              <button
                onClick={() => {
                  setOpenPopover(false);
                  setShowExportApplicationsModal(true);
                }}
                className="w-full rounded-md p-2 hover:bg-neutral-100 active:bg-neutral-200"
              >
                <IconMenu
                  text="Export as CSV"
                  icon={<Download className="size-4" />}
                />
              </button>
            </div>
          </div>
        }
        align="end"
      >
        <Button
          type="button"
          onClick={() => setOpenPopover(!openPopover)}
          variant="secondary"
          className="h-10 w-auto whitespace-nowrap px-1.5"
          disabled={!program}
          icon={<ThreeDots className="h-5 w-5 text-neutral-500" />}
        />
      </Popover>
    </>
  );
}
