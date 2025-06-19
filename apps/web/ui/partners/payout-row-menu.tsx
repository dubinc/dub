import { retryFailedPaypalPayoutsAction } from "@/lib/actions/partners/retry-failed-paypal-payouts";
import { PartnerPayoutResponse } from "@/lib/types";
import { Button, Icon, Popover } from "@dub/ui";
import { Dots, Refresh2 } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { Row } from "@tanstack/react-table";
import { Command } from "cmdk";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";

export function PayoutRowMenu({ row }: { row: Row<PartnerPayoutResponse> }) {
  const [isOpen, setIsOpen] = useState(false);

  const { executeAsync, isPending } = useAction(
    retryFailedPaypalPayoutsAction,
    {
      onSuccess: () => {
        toast.success("Payout retry initiated successfully");
        setIsOpen(false);
      },
      onError: (error) => {
        toast.error(error.error.serverError || "Failed to retry payout");
      },
    },
  );

  const canRetry = row.original.status === "failed";

  if (!canRetry) {
    return null;
  }

  const retryPayout = async () => {
    if (
      window.confirm(
        "You're limited to 5 retry attempts per day. Please ensure your PayPal account is configured correctly before trying again.",
      )
    ) {
      await executeAsync({
        payoutId: row.original.id,
      });
    }
  };

  return (
    <Popover
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
      content={
        <Command tabIndex={0} loop className="pointer-events-auto">
          <Command.List className="flex w-screen flex-col gap-1 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[180px]">
            {canRetry && (
              <Command.Group className="p-1.5">
                <MenuItem
                  icon={Refresh2}
                  label="Retry payout"
                  onSelect={retryPayout}
                  disabled={isPending}
                />
              </Command.Group>
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
