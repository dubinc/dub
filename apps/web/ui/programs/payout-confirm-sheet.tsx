import { createDotsTransferAction } from "@/lib/actions/create-dots-transfer";
import { PayoutMethod } from "@/lib/dots/types";
import useWorkspace from "@/lib/swr/use-workspace";
import { PayoutWithPartnerProps } from "@/lib/types";
import { X } from "@/ui/shared/icons";
import { Button, Icon, Sheet } from "@dub/ui";
import { Check2 } from "@dub/ui/src/icons";
import {
  cn,
  currencyFormatter,
  DICEBEAR_AVATAR_URL,
  fetcher,
  formatDate,
} from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useParams } from "next/navigation";
import {
  Dispatch,
  Fragment,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import { DOTS_PAYOUT_PLATFORMS } from "../dots/platforms";

type PayoutConfirmSheetProps = {
  payout: PayoutWithPartnerProps;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

function PayoutConfirmSheetContent({
  payout,
  setIsOpen,
}: PayoutConfirmSheetProps) {
  const { id: workspaceId } = useWorkspace();
  const { programId } = useParams();

  // TODO: [payouts] Use real sales count data
  const totalSales = 2;

  const invoiceData = useMemo(
    () => ({
      Partner: (
        <div className="flex items-center gap-2">
          <img
            src={
              payout.partner.logo ||
              `${DICEBEAR_AVATAR_URL}${payout.partner.name}`
            }
            alt={payout.partner.name}
            className="size-5 rounded-full"
          />
          <div>{payout.partner.name}</div>
        </div>
      ),
      Period: `${formatDate(payout.periodStart, {
        month: "short",
        year:
          new Date(payout.periodStart).getFullYear() ===
          new Date(payout.periodEnd).getFullYear()
            ? undefined
            : "numeric",
      })}-${formatDate(payout.periodEnd, { month: "short" })}`,
      Sales: totalSales,
      Amount: currencyFormatter(payout.amount / 100, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      Fee: currencyFormatter(payout.fee / 100, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      Total: currencyFormatter(payout.total / 100, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    }),
    [payout, totalSales],
  );

  const { data: payoutMethods, error: payoutMethodsError } = useSWR<
    PayoutMethod[]
  >(
    `/api/programs/${programId}/partners/${payout.partner.id}/payout-methods?workspaceId=${workspaceId}`,
    fetcher,
  );

  const [selectedPayoutMethod, setSelectedPayoutMethod] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!payoutMethods || selectedPayoutMethod !== null) return;

    setSelectedPayoutMethod(
      payoutMethods.length ? payoutMethods[0].platform : "manual",
    );
  }, [payoutMethods, selectedPayoutMethod]);

  const { executeAsync, isExecuting } = useAction(createDotsTransferAction, {
    onError({ error }) {
      toast.error(error.serverError?.serverError);
    },
  });

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
            {payoutMethods ? (
              <>
                {payoutMethods.map((method) => {
                  const platform =
                    DOTS_PAYOUT_PLATFORMS.find(
                      (p) => p.id === method.platform,
                    ) ?? DOTS_PAYOUT_PLATFORMS[0];

                  return (
                    <PayoutMethodOption
                      key={method.platform}
                      {...platform}
                      description={`Typically arrives ${platform.duration}`}
                      isDefault={method.default}
                      selectedPayoutMethod={selectedPayoutMethod}
                      setSelectedPayoutMethod={setSelectedPayoutMethod}
                    />
                  );
                })}
                <PayoutMethodOption
                  id="manual"
                  icon={Check2}
                  iconBgColor="bg-neutral-100"
                  name="Manual payout"
                  description="Marks the invoice as paid"
                  selectedPayoutMethod={selectedPayoutMethod}
                  setSelectedPayoutMethod={setSelectedPayoutMethod}
                />
              </>
            ) : !payoutMethodsError ? (
              [...Array(2)].map((_, idx) => (
                <div
                  key={idx}
                  className="flex animate-pulse items-center gap-2 rounded-lg border border-neutral-200 bg-white p-4"
                >
                  <div className="flex size-10 items-center justify-center rounded-md bg-neutral-200" />
                  <div>
                    <div className="h-4 w-24 rounded-md bg-neutral-200" />
                    <div className="mt-1 h-4 w-32 rounded-md bg-neutral-200" />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-neutral-500">
                Failed to load payout methods
              </div>
            )}
          </div>
          {payoutMethods && payoutMethods.length === 0 && (
            <div className="mt-6">
              <p className="text-sm text-neutral-500">
                This partner has no payout methods configured.
              </p>
              {/* TODO: [payouts] Fetch partner email and add contact partner button */}
            </div>
          )}
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
            disabled={!payout.partner.dotsUserId || !selectedPayoutMethod}
            onClick={async () => {
              if (!payout.partner.dotsUserId) {
                toast.error("Partner has no Dots user ID");
                return;
              }

              // TODO: [payouts] Use selectedPayoutMethod (including handling for "manual")

              await executeAsync({
                workspaceId: workspaceId!,
                dotsUserId: payout.partner.dotsUserId,
                payoutId: payout.id,
                amount: payout.amount,
                fee: payout.fee,
              });
              await mutate(
                (key) =>
                  typeof key === "string" &&
                  key.startsWith(`/api/programs/${programId}/payouts`),
                undefined,
                { revalidate: true },
              );
              toast.success("Successfully created payout");
              setIsOpen(false);
            }}
            text="Confirm payout"
            className="w-fit"
            loading={isExecuting}
          />
        </div>
      </div>
    </>
  );
}

function PayoutMethodOption({
  id,
  icon: Icon,
  iconBgColor,
  name,
  description,
  isDefault,
  selectedPayoutMethod,
  setSelectedPayoutMethod,
}: {
  id: string;
  icon: Icon;
  iconBgColor: string;
  name: string;
  description: string;
  isDefault?: boolean;
  selectedPayoutMethod: string | null;
  setSelectedPayoutMethod: Dispatch<SetStateAction<string | null>>;
}) {
  return (
    <button
      type="button"
      onClick={() => setSelectedPayoutMethod(id)}
      className={cn(
        "flex items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-4 text-left",
        "transition-[background-color,border-color,box-shadow] duration-75 hover:bg-neutral-50",
        selectedPayoutMethod === id &&
          "border-neutral-900 ring-1 ring-inset ring-neutral-900",
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-md",
            iconBgColor,
          )}
        >
          <Icon className="size-4.5 text-neutral-900" />
        </div>
        <div>
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-neutral-800">{name}</span>
            {isDefault && (
              <div className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-600">
                Default
              </div>
            )}
          </div>
          <div className="text-xs text-neutral-400">{description}</div>
        </div>
      </div>
      <div
        className={cn(
          "size-4 rounded-full border border-neutral-400 transition-shadow duration-75",
          selectedPayoutMethod === id &&
            "border-neutral-900 ring-2 ring-inset ring-neutral-900",
        )}
      />
    </button>
  );
}

export function PayoutConfirmSheet({
  isOpen,
  ...rest
}: PayoutConfirmSheetProps & {
  isOpen: boolean;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={rest.setIsOpen}>
      <PayoutConfirmSheetContent {...rest} />
    </Sheet>
  );
}

export function usePayoutConfirmSheet({
  payout,
}: Omit<PayoutConfirmSheetProps, "setIsOpen"> & { nested?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  return {
    payoutConfirmSheet: (
      <PayoutConfirmSheet
        setIsOpen={setIsOpen}
        isOpen={isOpen}
        payout={payout}
      />
    ),
    setIsOpen,
  };
}
