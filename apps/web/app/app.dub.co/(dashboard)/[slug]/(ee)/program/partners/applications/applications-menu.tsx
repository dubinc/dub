"use client";

import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { useApplicationSettingsModal } from "@/ui/modals/application-settings-modal";
import { useExportApplicationsModal } from "@/ui/modals/export-applications-modal";
import { ThreeDots } from "@/ui/shared/icons";
import { Button, Popover, UserXmark } from "@dub/ui";
import { Download, Gear, UserCheck } from "@dub/ui/icons";
import Link from "next/link";
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

  return (
    <>
      <ExportApplicationsModal />
      <ApplicationSettingsModal />
      <Button
        text="Application settings"
        onClick={() => setShowApplicationSettingsModal(true)}
        variant="secondary"
        className="hidden sm:flex"
      />
      <Popover
        openPopover={isOpen}
        setOpenPopover={setIsOpen}
        content={
          <div className="w-full md:w-56">
            <div className="grid gap-px p-2">
              <p className="mb-1.5 mt-1 flex items-center gap-2 px-1 text-xs font-medium text-neutral-500">
                Application Settings
              </p>
              <button
                onClick={() => {
                  setShowApplicationSettingsModal(true);
                  setIsOpen(false);
                }}
                className="w-full rounded-md p-2 hover:bg-neutral-100 active:bg-neutral-200 sm:hidden"
              >
                <div className="flex items-center gap-2 text-left">
                  <Gear className="size-4 shrink-0" />
                  <span className="text-sm font-medium">
                    Application settings
                  </span>
                </div>
              </button>
              <Link
                href={`/${workspaceSlug}/program/groups/${DEFAULT_PARTNER_GROUP.slug}/settings`}
                className="w-full rounded-md p-2 hover:bg-neutral-100 active:bg-neutral-200"
              >
                <div className="flex items-center gap-2 text-left">
                  <UserCheck className="size-4 shrink-0" />
                  <span className="text-sm font-medium">
                    Auto-approval settings
                  </span>
                </div>
              </Link>
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
            </div>

            <div className="border-t border-neutral-200" />

            <div className="grid gap-px p-2">
              <p className="mb-1.5 mt-1 flex items-center gap-2 px-1 text-xs font-medium text-neutral-500">
                Export Applications
              </p>
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
