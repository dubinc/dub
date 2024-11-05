import { PayoutWithPartnerProps } from "@/lib/types";
import { X } from "@/ui/shared/icons";
import { Button, Sheet } from "@dub/ui";
import { GreekTemple } from "@dub/ui/src/icons";
import { cn, currencyFormatter, formatDate } from "@dub/utils";
import { Dispatch, Fragment, SetStateAction, useMemo, useState } from "react";
import { toast } from "sonner";

function PayoutConfirmSheetContent({
  payout,
  setIsOpen,
}: {
  payout: PayoutWithPartnerProps;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}) {
  // TODO: Use real data
  const totalConversions = 2;

  const invoiceData = useMemo(
    () => ({
      Partner: payout.partner.name,
      Period: `${formatDate(payout.periodStart, {
        month: "short",
        year:
          new Date(payout.periodStart).getFullYear() ===
          new Date(payout.periodEnd).getFullYear()
            ? undefined
            : "numeric",
      })}-${formatDate(payout.periodEnd, { month: "short" })}`,
      Conversions: totalConversions,
      Total: currencyFormatter(payout.total / 100, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    }),
    [payout, totalConversions],
  );

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("wire");

  return (
    <>
      <div>
        <div className="flex items-start justify-between border-b border-neutral-200 p-6">
          <Sheet.Title className="text-xl font-semibold">
            Confirm payout
          </Sheet.Title>
          <Sheet.Close asChild>
            <Button
              variant="outline"
              icon={<X className="size-5" />}
              className="h-auto w-fit p-1"
            />
          </Sheet.Close>
        </div>
        <div className="flex flex-col gap-4 p-6">
          <div className="text-base font-medium text-neutral-900">Summary</div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {Object.entries(invoiceData).map(([key, value]) => (
              <Fragment key={key}>
                <div className="font-medium text-neutral-500">{key}</div>
                <div className="text-neutral-800">{value}</div>
              </Fragment>
            ))}
          </div>
        </div>
        <div className="p-6 pt-2">
          <div className="text-base font-medium text-neutral-900">Method</div>
          <div className="mt-4 flex flex-col gap-2">
            {/* TODO: Add dynamic payment methods */}
            <button
              type="button"
              className={cn(
                "flex items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-4 text-left",
                "transition-colors duration-75 hover:bg-neutral-50",
                selectedPaymentMethod === "wire" &&
                  "border-neutral-900 ring-1 ring-inset ring-neutral-900",
              )}
            >
              <div className="flex items-center gap-2">
                <div className="flex size-10 items-center justify-center rounded-md bg-neutral-100">
                  <GreekTemple className="size-4.5 text-neutral-900" />
                </div>
                <div>
                  <div className="text-sm font-medium text-neutral-800">
                    Wire transfer
                  </div>
                  <div className="text-xs text-neutral-400">2.9% + $0.30</div>
                </div>
              </div>
              <div
                className={cn(
                  "size-4 rounded-full border border-neutral-400",
                  selectedPaymentMethod === "wire" &&
                    "border-neutral-900 ring-2 ring-inset ring-neutral-900",
                )}
              />
            </button>
          </div>
        </div>
      </div>
      <div className="flex grow flex-col justify-end">
        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 p-5">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsOpen(false)}
            text="Cancel"
            className="w-fit"
          />
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              toast.info("WIP");
              setIsOpen(false);
            }}
            text="Confirm payout"
            className="w-fit"
          />
        </div>
      </div>
    </>
  );
}

export function usePayoutConfirmSheet({
  payout,
}: {
  payout: PayoutWithPartnerProps;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return {
    payoutConfirmSheet: (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <PayoutConfirmSheetContent payout={payout} setIsOpen={setIsOpen} />
      </Sheet>
    ),
    setIsOpen,
  };
}
