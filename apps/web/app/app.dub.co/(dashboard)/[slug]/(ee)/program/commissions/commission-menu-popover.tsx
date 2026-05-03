"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { useExportCommissionsModal } from "@/ui/modals/export-commissions-modal";
import { ThreeDots } from "@/ui/shared/icons";
import {
  Button,
  ChartLine,
  Download,
  IconMenu,
  Popover,
  Refresh2,
  useRouterStuff,
} from "@dub/ui";
import Link from "next/link";
import { useState } from "react";
import { useCreateClawbackSheet } from "./create-clawback-sheet";

export function CommmissionsMenuPopover() {
  const [openPopover, setOpenPopover] = useState(false);
  const { slug } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const { createClawbackSheet, setIsOpen: setClawbackSheetOpen } =
    useCreateClawbackSheet({});

  const { ExportCommissionsModal, setShowExportCommissionsModal } =
    useExportCommissionsModal();

  return (
    <>
      {createClawbackSheet}
      <ExportCommissionsModal />
      <Popover
        content={
          <div className="w-full md:w-52">
            <div className="grid gap-px p-2">
              <button
                onClick={() => {
                  setOpenPopover(false);
                  setClawbackSheetOpen(true);
                }}
                className="w-full rounded-md p-2 hover:bg-neutral-100 active:bg-neutral-200"
              >
                <IconMenu
                  text="Create clawback"
                  icon={<Refresh2 className="size-4" />}
                />
              </button>
              <Link
                href={`/${slug}/program/analytics/commissions${getQueryString(
                  undefined,
                  {
                    include: [
                      "interval",
                      "start",
                      "end",
                      "partnerId",
                      "groupId",
                      "type",
                    ],
                  },
                )}`}
              >
                <button className="w-full rounded-md p-2 hover:bg-neutral-100 active:bg-neutral-200">
                  <IconMenu
                    text="View analytics"
                    icon={<ChartLine className="size-4" />}
                  />
                </button>
              </Link>
            </div>

            <div className="border-t border-neutral-200" />

            <div className="grid gap-px p-2">
              <p className="mb-1.5 mt-1 flex items-center gap-2 px-1 text-xs font-medium text-neutral-500">
                Export Commissions
              </p>
              <button
                onClick={() => {
                  setOpenPopover(false);
                  setShowExportCommissionsModal(true);
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
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}
        align="end"
      >
        <Button
          onClick={() => setOpenPopover(!openPopover)}
          variant="secondary"
          className="h-8 w-auto px-1.5 sm:h-9"
          icon={<ThreeDots className="h-5 w-5 text-neutral-500" />}
        />
      </Popover>
    </>
  );
}
