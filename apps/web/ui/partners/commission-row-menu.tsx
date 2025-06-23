import { CommissionResponse } from "@/lib/types";
import { Button, Icon, Popover, useCopyToClipboard } from "@dub/ui";
import {
  CircleCheck,
  CircleXmark,
  Dots,
  Duplicate,
  InvoiceDollar,
  ShieldAlert,
} from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { Row } from "@tanstack/react-table";
import { Command } from "cmdk";
import { useState } from "react";
import { toast } from "sonner";
import { useMarkCommissionDuplicateModal } from "./mark-commission-duplicate-modal";
import { useMarkCommissionFraudOrCanceledModal } from "./mark-commission-fraud-or-canceled-modal";

export function CommissionRowMenu({ row }: { row: Row<CommissionResponse> }) {
  const [isOpen, setIsOpen] = useState(false);

  const {
    setShowModal: setShowMarkCommissionDuplicateModal,
    MarkCommissionDuplicateModal,
  } = useMarkCommissionDuplicateModal({
    commission: row.original,
  });

  const [commissionStatus, setCommissionStatus] = useState<
    "fraud" | "canceled"
  >("fraud");

  const { setShowModal, MarkCommissionFraudOrCanceledModal } =
    useMarkCommissionFraudOrCanceledModal({
      commission: row.original,
      status: commissionStatus,
    });

  const [copiedInvoiceId, copyInvoiceIdToClipboard] = useCopyToClipboard();

  const showUpdateActions =
    row.original.status === "pending" || row.original.status === "processed";

  if (!showUpdateActions && !row.original.invoiceId) {
    return null;
  }

  if (row.original.type === "custom") {
    return null;
  }

  return (
    <>
      <MarkCommissionDuplicateModal />
      <MarkCommissionFraudOrCanceledModal />
      <Popover
        openPopover={isOpen}
        setOpenPopover={setIsOpen}
        content={
          <Command tabIndex={0} loop className="pointer-events-auto">
            <Command.List className="flex w-screen flex-col gap-1 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[180px]">
              {showUpdateActions && (
                <Command.Group className="p-1.5">
                  <MenuItem
                    icon={Duplicate}
                    label="Mark as duplicate"
                    onSelect={() => {
                      setShowMarkCommissionDuplicateModal(true);
                      setIsOpen(false);
                    }}
                  />

                  <MenuItem
                    icon={ShieldAlert}
                    label="Mark as fraud"
                    onSelect={() => {
                      setCommissionStatus("fraud");
                      setShowModal(true);
                      setIsOpen(false);
                    }}
                  />

                  <MenuItem
                    icon={CircleXmark}
                    label="Mark as canceled"
                    onSelect={() => {
                      setCommissionStatus("canceled");
                      setShowModal(true);
                      setIsOpen(false);
                    }}
                  />
                </Command.Group>
              )}
              {row.original.invoiceId && (
                <>
                  <Command.Separator className="w-full border-t border-neutral-200" />
                  <Command.Group className="p-1.5">
                    <MenuItem
                      icon={copiedInvoiceId ? CircleCheck : InvoiceDollar}
                      label="Copy invoice ID"
                      onSelect={() => {
                        copyInvoiceIdToClipboard(row.original.invoiceId!);
                        toast.success("Invoice ID copied to clipboard");
                      }}
                    />
                  </Command.Group>
                </>
              )}
            </Command.List>
          </Command>
        }
        align="end"
      >
        <Button
          type="button"
          className="h-8 whitespace-nowrap px-2"
          variant="outline"
          icon={<Dots className="h-4 w-4 shrink-0" />}
        />
      </Popover>
    </>
  );
}

function MenuItem({
  icon: IconComp,
  label,
  onSelect,
  disabled,
}: {
  icon: Icon;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <Command.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-md p-2 text-sm text-neutral-600",
        "data-[selected=true]:bg-neutral-100",
        disabled && "cursor-not-allowed opacity-50",
      )}
      onSelect={onSelect}
      disabled={disabled}
    >
      <IconComp className="size-4 shrink-0 text-neutral-500" />
      {label}
    </Command.Item>
  );
}
