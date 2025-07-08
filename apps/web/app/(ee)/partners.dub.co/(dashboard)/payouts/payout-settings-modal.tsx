"use client";

import { updatePartnerPayoutSettingsAction } from "@/lib/actions/partners/update-partner-payout-settings";
import {
  BELOW_MIN_WITHDRAWAL_FEE_CENTS,
  MIN_WITHDRAWAL_AMOUNT_CENTS,
  MINIMUM_WITHDRAWAL_AMOUNTS,
} from "@/lib/partners/constants";
import { mutatePrefix } from "@/lib/swr/mutate";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { partnerPayoutSettingsSchema } from "@/lib/zod/schemas/partners";
import { Button, Modal, Slider } from "@dub/ui";
import { currencyFormatter } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import { z } from "zod";

type PayoutSettingsModalProps = {
  showPayoutSettingsModal: boolean;
  setShowPayoutSettingsModal: Dispatch<SetStateAction<boolean>>;
};

type PayoutSettingsFormData = z.infer<typeof partnerPayoutSettingsSchema>;

function PayoutSettingsModal(props: PayoutSettingsModalProps) {
  const { showPayoutSettingsModal, setShowPayoutSettingsModal } = props;

  return (
    <Modal
      showModal={showPayoutSettingsModal}
      setShowModal={setShowPayoutSettingsModal}
    >
      <PayoutSettingsModalInner {...props} />
    </Modal>
  );
}

function PayoutSettingsModalInner({
  setShowPayoutSettingsModal,
}: PayoutSettingsModalProps) {
  const { partner } = usePartnerProfile();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isDirty },
  } = useForm<PayoutSettingsFormData>({
    defaultValues: {
      companyName: partner?.companyName || undefined,
      address: partner?.invoiceSettings?.address || undefined,
      taxId: partner?.invoiceSettings?.taxId || undefined,
      minWithdrawalAmount: partner?.minWithdrawalAmount,
    },
  });

  const { executeAsync, isPending } = useAction(
    updatePartnerPayoutSettingsAction,
    {
      onSuccess: async () => {
        toast.success("Payout settings updated successfully!");
        setShowPayoutSettingsModal(false);
        mutatePrefix("/api/partner-profile");
      },
      onError({ error }) {
        toast.error(error.serverError);
      },
    },
  );

  const onSubmit = async (data: PayoutSettingsFormData) => {
    await executeAsync(data);
  };

  const shouldDisableSubmit = useMemo(() => {
    return !watch("companyName") || !isDirty;
  }, [watch, isDirty]);

  const minWithdrawalAmount = watch("minWithdrawalAmount");

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-4 border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">Payout settings</h3>
      </div>

      {/*  Minimum withdrawal amount */}
      <div className="space-y-10 bg-neutral-50 p-4 sm:p-6">
        <div>
          <h4 className="text-base font-semibold leading-6 text-neutral-900">
            Minimum withdrawal amount
          </h4>
          <p className="text-sm font-medium leading-5 text-neutral-500">
            Set the minimum amount for funds to be withdrawn from Dub into your
            connected payout account.
          </p>
        </div>

        <div>
          <div className="mb-2 text-2xl font-medium leading-6 text-neutral-800">
            {currencyFormatter(minWithdrawalAmount / 100)} USD
          </div>

          <Slider
            value={minWithdrawalAmount}
            min={MINIMUM_WITHDRAWAL_AMOUNTS[0]}
            max={
              MINIMUM_WITHDRAWAL_AMOUNTS[MINIMUM_WITHDRAWAL_AMOUNTS.length - 1]
            }
            onChange={(value) => {
              const closest = MINIMUM_WITHDRAWAL_AMOUNTS.reduce((prev, curr) =>
                Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev,
              );

              setValue("minWithdrawalAmount", closest, { shouldDirty: true });
            }}
            marks={MINIMUM_WITHDRAWAL_AMOUNTS}
            hint={
              minWithdrawalAmount < MIN_WITHDRAWAL_AMOUNT_CENTS
                ? `${currencyFormatter(BELOW_MIN_WITHDRAWAL_FEE_CENTS / 100)} payout fee for payouts under $100`
                : undefined
            }
          />
        </div>

        {/* Invoice details */}
        <div className="space-y-4">
          <div>
            <h4 className="text-base font-semibold leading-6 text-neutral-900">
              Invoice details (optional)
            </h4>
            <p className="text-sm font-medium leading-5 text-neutral-500">
              This information is added to your payout invoices.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium leading-5 text-neutral-900">
              Business name
            </label>
            <div className="relative mt-2 rounded-md shadow-sm">
              <input
                required
                autoFocus
                className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                {...register("companyName", { required: true })}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium leading-5 text-neutral-900">
              Business address
            </label>
            <TextareaAutosize
              className="mt-2 block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
              minRows={4}
              {...register("address")}
            />
          </div>

          <div>
            <label className="text-sm font-medium leading-5 text-neutral-900">
              Business tax ID
            </label>
            <div className="relative mt-2 rounded-md shadow-sm">
              <input
                className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                {...register("taxId")}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
        <Button
          variant="secondary"
          text="Cancel"
          disabled={isPending}
          className="h-8 w-fit px-3"
          onClick={() => setShowPayoutSettingsModal(false)}
        />

        <Button
          text="Save"
          className="h-8 w-fit px-3"
          loading={isPending}
          disabled={shouldDisableSubmit}
          type="submit"
        />
      </div>
    </form>
  );
}

export function usePayoutSettingsModal() {
  const [showPayoutSettingsModal, setShowPayoutSettingsModal] = useState(false);

  const PayoutSettingsModalCallback = useCallback(() => {
    return (
      <PayoutSettingsModal
        showPayoutSettingsModal={showPayoutSettingsModal}
        setShowPayoutSettingsModal={setShowPayoutSettingsModal}
      />
    );
  }, [showPayoutSettingsModal, setShowPayoutSettingsModal]);

  return useMemo(
    () => ({
      setShowPayoutSettingsModal,
      PayoutSettingsModal: PayoutSettingsModalCallback,
    }),
    [setShowPayoutSettingsModal, PayoutSettingsModalCallback],
  );
}
