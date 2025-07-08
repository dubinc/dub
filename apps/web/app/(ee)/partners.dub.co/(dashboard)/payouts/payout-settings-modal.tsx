"use client";

import { updatePartnerPayoutSettingsAction } from "@/lib/actions/partners/update-partner-payout-settings";
import { MINIMUM_WITHDRAWAL_AMOUNTS } from "@/lib/partners/constants";
import { mutatePrefix } from "@/lib/swr/mutate";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { partnerPayoutSettingsSchema } from "@/lib/zod/schemas/partners";
import { Button, Modal } from "@dub/ui";
import { cn } from "@dub/utils";
import * as RadixSlider from "@radix-ui/react-slider";
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

  const currentMinWithdrawalAmount = watch("minWithdrawalAmount");

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-4 border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">Payout settings</h3>
      </div>

      {/*  Minimum withdrawal amount */}
      <div className="space-y-6 bg-neutral-50 p-4 sm:p-6">
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
          <Slider
            value={currentMinWithdrawalAmount}
            onChange={(value) =>
              setValue("minWithdrawalAmount", value, { shouldDirty: true })
            }
            min={MINIMUM_WITHDRAWAL_AMOUNTS[0]}
            max={
              MINIMUM_WITHDRAWAL_AMOUNTS[MINIMUM_WITHDRAWAL_AMOUNTS.length - 1]
            }
            marks={MINIMUM_WITHDRAWAL_AMOUNTS}
            formatValue={(value) => `$${(value / 100).toFixed(0)} USD`}
            hint="$2 payout fee for payouts under $100"
          />
        </div>
      </div>

      {/* Invoice details */}
      <div className="flex flex-col gap-2 bg-neutral-50 p-4 sm:p-6">
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

// Generic, reusable slider component
export type SliderProps = {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  marks?: number[];
  formatValue?: (value: number) => React.ReactNode;
  className?: string;
  hint?: React.ReactNode;
  disabled?: boolean;
};

export function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
  marks,
  formatValue,
  className,
  hint,
  disabled,
}: SliderProps) {
  // Calculate percent for thumb/track
  const percent = ((value - min) / (max - min)) * 100;
  // Default marks: 4 evenly spaced
  const sliderMarks = marks || [
    min,
    min + (max - min) / 3,
    min + (2 * (max - min)) / 3,
    max,
  ];

  return (
    <div className={cn("w-full", className)}>
      {/* Value label */}
      <div className="mb-2 text-3xl font-semibold text-neutral-900">
        {formatValue ? formatValue(value) : value}
      </div>
      {/* Slider */}
      <RadixSlider.Root
        className="relative flex h-6 w-full items-center"
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        disabled={disabled}
        aria-label="Slider"
      >
        {/* Track */}
        <RadixSlider.Track className="relative h-3 w-full rounded-full bg-neutral-200">
          {/* Active range */}
          <RadixSlider.Range className="absolute h-3 rounded-full bg-neutral-900" />
          {/* Marks/dots */}
          {sliderMarks.map((mark, i) => {
            const left = ((mark - min) / (max - min)) * 100;
            return (
              <span
                key={mark}
                className={cn(
                  "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border",
                  left === percent
                    ? "border-neutral-900 bg-white shadow"
                    : "border-none bg-neutral-200",
                  "transition-all duration-200",
                )}
                style={{ left: `calc(${left}% - 0.75rem)` }}
              >
                {/* Inner dot for active mark */}
                {left === percent && (
                  <span className="block h-4 w-4 rounded-full bg-neutral-900" />
                )}
              </span>
            );
          })}
        </RadixSlider.Track>
        {/* Thumb */}
        <RadixSlider.Thumb
          className="absolute left-0 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border-2 border-neutral-900 bg-white shadow focus:outline-none focus:ring-2 focus:ring-neutral-400"
          style={{ left: `calc(${percent}% - 0.75rem)` }}
        />
      </RadixSlider.Root>
      {/* Hint/description */}
      {hint && <div className="mt-2 text-xs text-neutral-500">{hint}</div>}
    </div>
  );
}
