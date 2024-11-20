import { updateSaleStatusAction } from "@/lib/actions/update-sale-status";
import useWorkspace from "@/lib/swr/use-workspace";
import { SaleProps } from "@/lib/types";
import { Button, Icon, Popover } from "@dub/ui";
import {
  CircleHalfDottedClock,
  Dots,
  Duplicate,
  ShieldAlert,
} from "@dub/ui/src/icons";
import { cn } from "@dub/utils";
import { Row } from "@tanstack/react-table";
import { Command } from "cmdk";
import { useAction } from "next-safe-action/hooks";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";

export function SaleRowMenu({ row }: { row: Row<SaleProps> }) {
  const { id: workspaceId } = useWorkspace();
  const { programId } = useParams() as { programId: string };
  const [isOpen, setIsOpen] = useState(false);

  const { executeAsync } = useAction(updateSaleStatusAction, {
    onSuccess: async () => {
      mutate(
        (key) =>
          typeof key === "string" &&
          (key.startsWith(`/api/programs/${programId}/sales`) ||
            key.startsWith(`/api/programs/${programId}/payouts`)),
      );
    },
  });

  const updateStatus = (status: "pending" | "duplicate" | "fraud") => {
    toast.promise(
      executeAsync({
        workspaceId: workspaceId!,
        saleId: row.original.id,
        status,
      }),
      {
        loading: "Updating sale status...",
        success: "Sale status updated",
        error: "Failed to update sale status",
      },
    );
  };

  const isPaid = row.original.status === "paid";

  return (
    <Popover
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
      content={
        <Command
          tabIndex={0}
          loop
          className="pointer-events-auto focus:outline-none"
        >
          <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm sm:w-auto sm:min-w-[180px]">
            {["duplicate", "fraud"].includes(row.original.status) ? (
              <MenuItem
                icon={CircleHalfDottedClock}
                label="Mark as pending"
                onSelect={() => {
                  updateStatus("pending");
                  setIsOpen(false);
                }}
              />
            ) : (
              <>
                <MenuItem
                  icon={Duplicate}
                  label="Mark as duplicate"
                  onSelect={() => {
                    updateStatus("duplicate");
                    setIsOpen(false);
                  }}
                  disabled={isPaid}
                />
                <MenuItem
                  icon={ShieldAlert}
                  label="Mark as fraud"
                  onSelect={() => {
                    updateStatus("fraud");
                    setIsOpen(false);
                  }}
                  disabled={isPaid}
                />
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
        "data-[selected=true]:bg-gray-100",
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
