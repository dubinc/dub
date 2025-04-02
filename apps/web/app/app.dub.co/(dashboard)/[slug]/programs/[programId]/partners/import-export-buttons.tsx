"use client";

import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { useExportPartnersModal } from "@/ui/modals/export-partners-modal";
import { useImportRewardfulModal } from "@/ui/modals/import-rewardful-modal";
import { Download, ThreeDots } from "@/ui/shared/icons";
import { Button, IconMenu, Popover } from "@dub/ui";
import { useRouter } from "next/navigation";
import { ReactNode, useState } from "react";

export function ImportExportButtons() {
  const router = useRouter();
  const { program } = useProgram();
  const { slug, flags } = useWorkspace();
  const [openPopover, setOpenPopover] = useState(false);

  const { ImportRewardfulModal } = useImportRewardfulModal();
  const { ExportPartnersModal, setShowExportPartnersModal } =
    useExportPartnersModal();

  return (
    <>
      <ImportRewardfulModal />
      <ExportPartnersModal />
      <Popover
        content={
          <div className="w-full md:w-52">
            <div className="grid gap-px p-2">
              <p className="mb-1.5 mt-1 flex items-center gap-2 px-1 text-xs font-medium text-neutral-500">
                Import Partners
              </p>
              <ImportOption
                onClick={() => {
                  setOpenPopover(false);
                  router.push(
                    `/${slug}/programs/${program?.id}/partners?import=rewardful`,
                  );
                }}
              >
                <IconMenu
                  text="Import from Rewardful"
                  icon={
                    <img
                      src="https://assets.dub.co/misc/icons/rewardful.svg"
                      alt="Rewardful logo"
                      className="h-4 w-4"
                    />
                  }
                />
              </ImportOption>
            </div>

            <div className="border-t border-neutral-200" />

            <div className="grid gap-px p-2">
              <p className="mb-1.5 mt-1 flex items-center gap-2 px-1 text-xs font-medium text-neutral-500">
                Export Partners
              </p>
              <button
                onClick={() => {
                  setOpenPopover(false);
                  setShowExportPartnersModal(true);
                }}
                className="w-full rounded-md p-2 hover:bg-neutral-100 active:bg-neutral-200"
              >
                <IconMenu
                  text="Export as CSV"
                  icon={<Download className="h-4 w-4" />}
                />
              </button>
            </div>
          </div>
        }
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}
        align="end"
      >
        <Button
          onClick={() => setOpenPopover(!openPopover)}
          variant="secondary"
          className="w-auto px-1.5"
          icon={<ThreeDots className="h-5 w-5 text-neutral-500" />}
        />
      </Popover>
    </>
  );
}

function ImportOption({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-md p-2 hover:bg-neutral-100 active:bg-neutral-200"
    >
      {children}
    </button>
  );
}
