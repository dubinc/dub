"use client";

import { useCustomerExportModal } from "@/ui/modals/customer-export-modal";
import { ThreeDots } from "@/ui/shared/icons";
import { Button, Download, IconMenu, Popover } from "@dub/ui";
import { useState } from "react";

export function ExportCustomersButton() {
  const [openPopover, setOpenPopover] = useState(false);

  const { CustomerExportModal, setShowCustomerExportModal } =
    useCustomerExportModal();

  return (
    <>
      <CustomerExportModal />
      <Popover
        content={
          <div className="w-full md:w-52">
            <div className="grid gap-px p-2">
              <p className="mb-1.5 mt-1 flex items-center gap-2 px-1 text-xs font-medium text-neutral-500">
                Export Customers
              </p>
              <button
                onClick={() => {
                  setOpenPopover(false);
                  setShowCustomerExportModal(true);
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
          className="h-8 w-auto px-1.5 sm:h-9"
          icon={<ThreeDots className="h-5 w-5 text-neutral-500" />}
        />
      </Popover>
    </>
  );
}
