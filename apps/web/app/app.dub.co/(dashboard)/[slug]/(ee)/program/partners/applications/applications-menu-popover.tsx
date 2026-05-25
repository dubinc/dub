"use client";

import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { useApplicationSettingsModal } from "@/ui/modals/application-settings-modal";
import { useExportApplicationsModal } from "@/ui/modals/export-applications-modal";
import { ThreeDots } from "@/ui/shared/icons";
import {
  Button,
  Download,
  IconMenu,
  Popover,
  useMediaQuery,
  UserXmark,
} from "@dub/ui";
import Link from "next/link";
import { useState } from "react";

export function ApplicationsMenuPopover() {
  const { slug: workspaceSlug } = useWorkspace();
  const { program } = useProgram();

  const [openPopover, setOpenPopover] = useState(false);

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
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}
        content={
          <div className="w-full md:w-60">
            <div className="grid gap-px p-2">
              <Link
                href={`/${workspaceSlug}/program/partners/applications/rejected`}
                onClick={() => setOpenPopover(false)}
              >
                <button className="w-full rounded-md p-2 hover:bg-neutral-100 active:bg-neutral-200">
                  <IconMenu
                    text="View rejected applications"
                    icon={<UserXmark className="size-4" />}
                  />
                </button>
              </Link>
            </div>

            <div className="border-t border-neutral-200" />

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
          className="h-8 w-auto whitespace-nowrap px-1.5 sm:h-9"
          disabled={!program}
          icon={<ThreeDots className="h-5 w-5 text-neutral-500" />}
        />
      </Popover>
    </>
  );
}
