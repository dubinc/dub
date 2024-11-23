import { withdrawFundsAction } from "@/lib/actions/partners/withdraw-funds";
import { DotsPayoutPlatform } from "@/lib/dots/types";
import useDotsUser from "@/lib/swr/use-dots-user";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import usePayoutMethods from "@/lib/swr/use-payout-methods";
import { X } from "@/ui/shared/icons";
import { Button, Icon, Sheet } from "@dub/ui";
import {
  cn,
  currencyFormatter,
  DICEBEAR_AVATAR_URL,
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
import { mutate } from "swr";
import { DOTS_PAYOUT_PLATFORMS } from "../dots/platforms";

type PayoutWithdrawSheetProps = {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

function PayoutWithdrawSheetContent({ setIsOpen }: PayoutWithdrawSheetProps) {
  const { partnerId } = useParams<{ partnerId: string }>();
  const { partner, error: partnerError } = usePartnerProfile();
  const { dotsUser, error: dotsUserError } = useDotsUser();
  const { payoutMethods } = usePayoutMethods();

  const summaryData = useMemo(
    () => ({
      Partner: (
        <div className="flex items-center gap-2">
          {partner || partnerError ? (
            <>
              <img
                src={partner?.image || `${DICEBEAR_AVATAR_URL}${partner?.name}`}
                alt={partner?.name ?? "Partner"}
                className="size-5 rounded-full"
              />
              <div>{partner?.name ?? "-"}</div>
            </>
          ) : (
            <>
              <div className="size-5 animate-pulse rounded-full bg-neutral-200" />
              <div className="h-5 w-24 animate-pulse rounded-md bg-neutral-200" />
            </>
          )}
        </div>
      ),
      Date: formatDate(new Date(), { month: "short" }),
      Total: dotsUserError ? (
        "-"
      ) : dotsUser?.wallet ? (
        currencyFormatter((dotsUser.wallet.withdrawable_amount ?? 0) / 100, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      ) : (
        <div className="h-5 w-12 animate-pulse rounded-md bg-neutral-200" />
      ),
    }),
    [partner, dotsUser],
  );

  const [selectedPayoutMethod, setSelectedPayoutMethod] =
    useState<DotsPayoutPlatform | null>(null);

  useEffect(() => {
    if (!payoutMethods.length || selectedPayoutMethod !== null) return;

    setSelectedPayoutMethod(
      dotsUser?.default_payout_method ?? payoutMethods[0].platform,
    );
  }, [dotsUser, selectedPayoutMethod]);

  const { executeAsync, isExecuting } = useAction(withdrawFundsAction, {
    onSuccess: async () => {
      await Promise.all([
        mutate(`/api/partners/${partnerId}/dots-user`),
        mutate(`/api/partners/${partnerId}/withdrawals`),
      ]);
      setIsOpen(false);
      toast.success("Successfully initiated withdrawal!");
    },
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  return (
    <>
      <div>
        <div className="flex items-start justify-between border-b border-neutral-200 p-6">
          <Sheet.Title className="text-xl font-semibold">
            Confirm withdrawal
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
            {Object.entries(summaryData).map(([key, value]) => (
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
            {payoutMethods.length ? (
              <>
                {payoutMethods
                  .sort((a, b) => Number(b.default) - Number(a.default)) // Show default first
                  .map((method) => {
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
              </>
            ) : !dotsUserError ? (
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
            disabled={!dotsUser?.id || !selectedPayoutMethod}
            onClick={() =>
              selectedPayoutMethod &&
              executeAsync({
                partnerId,
                platform: selectedPayoutMethod,
              })
            }
            loading={isExecuting}
            text="Confirm withdrawal"
            className="w-fit"
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
  selectedPayoutMethod: DotsPayoutPlatform | null;
  setSelectedPayoutMethod: Dispatch<SetStateAction<DotsPayoutPlatform | null>>;
}) {
  return (
    <button
      type="button"
      onClick={() => setSelectedPayoutMethod(id as DotsPayoutPlatform)}
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

export function PayoutWithdrawSheet({
  isOpen,
  ...rest
}: PayoutWithdrawSheetProps & {
  isOpen: boolean;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={rest.setIsOpen}>
      <PayoutWithdrawSheetContent {...rest} />
    </Sheet>
  );
}

export function usePayoutWithdrawSheet() {
  const [isOpen, setIsOpen] = useState(false);

  return {
    payoutWithdrawSheet: (
      <PayoutWithdrawSheet setIsOpen={setIsOpen} isOpen={isOpen} />
    ),
    setIsOpen,
  };
}
