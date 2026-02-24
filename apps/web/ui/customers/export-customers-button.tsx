"use client";

import { useExportCustomersModal } from "@/ui/modals/export-customers-modal";
import { Button } from "@dub/ui";
import { Download } from "@dub/ui/icons";

export function ExportCustomersButton() {
  const { ExportCustomersModal, setShowExportCustomersModal } =
    useExportCustomersModal();

  return (
    <>
      <ExportCustomersModal />
      <Button
        variant="secondary"
        className="h-8 w-auto px-1.5 sm:h-9"
        icon={<Download className="h-4 w-4" />}
        text="Export as CSV"
        onClick={() => setShowExportCustomersModal(true)}
      />
    </>
  );
}
