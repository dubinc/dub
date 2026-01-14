"use client";

import { markPartnerReferralClosedWonAction } from "@/lib/actions/referrals/mark-partner-referral-closed-won";
import { handleMoneyInputChange, handleMoneyKeyDown } from "@/lib/form-utils";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { partnerReferralSchema } from "@/lib/zod/schemas/partner-referrals";
import { Button, Modal } from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod/v4";

type PartnerReferralProps = z.infer<typeof partnerReferralSchema>;

type MarkPartnerReferralClosedWonFormData = {
  saleAmount: number | null;
  stripeCustomerId: string;
};

export function useMarkPartnerReferralClosedWonModal({
  referral,
}: {
  referral: PartnerReferralProps;
}) {
  const { id: workspaceId } = useWorkspace();
  const [showModal, setShowModal] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<MarkPartnerReferralClosedWonFormData>({
    defaultValues: {
      saleAmount: null,
      stripeCustomerId: "",
    },
  });

  const { executeAsync, isPending } = useAction(
    markPartnerReferralClosedWonAction,
    {
      onSuccess: async () => {
        toast.success("Partner referral marked as closed won successfully!");
        mutatePrefix("/api/programs/partner-referrals");
        setShowModal(false);
        reset();
      },
      onError({ error }) {
        toast.error(error.serverError);
      },
    },
  );

  const onSubmit = useCallback(
    async (data: MarkPartnerReferralClosedWonFormData) => {
      if (!workspaceId || !referral.id || data.saleAmount === null) {
        return;
      }

      // Convert sale amount from dollars to cents
      const saleAmountInCents = Math.round(data.saleAmount * 100);

      await executeAsync({
        workspaceId,
        referralId: referral.id,
        saleAmount: saleAmountInCents,
        stripeCustomerId: data.stripeCustomerId || undefined,
      });
    },
    [executeAsync, referral.id, workspaceId],
  );

  const ModalComponent = useCallback(() => {
    return (
      <Modal showModal={showModal} setShowModal={setShowModal}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-5 text-left">
            <h3 className="text-content-emphasis text-base font-semibold">
              Lead closed won
            </h3>
            <div className="text-content-subtle mt-1 text-sm">
              Are you sure you want to mark this partner referral as closed won?
            </div>
          </div>

          <div className="flex flex-col gap-4 bg-neutral-50 px-5 pb-4">
            <div>
              <label className="block text-sm font-medium text-neutral-900">
                Sale Amount (required)
              </label>
              <div className="relative mt-1.5 rounded-md shadow-sm">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-neutral-400">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={cn(
                    "block w-full rounded-md border-neutral-300 pl-6 pr-12 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                    errors.saleAmount &&
                      "border-red-600 focus:border-red-500 focus:ring-red-600",
                  )}
                  placeholder="0.00"
                  {...register("saleAmount", {
                    required: "Sale amount is required",
                    min: {
                      value: 0,
                      message: "Sale amount must be greater than or equal to 0",
                    },
                    valueAsNumber: true,
                    onChange: handleMoneyInputChange,
                  })}
                  onKeyDown={handleMoneyKeyDown}
                />
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-neutral-400">
                  USD
                </span>
              </div>
              {errors.saleAmount && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.saleAmount.message}
                </p>
              )}
              <p className="mt-1 text-xs text-neutral-500">
                This will be also recorded as a sale commission (if applicable)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-900">
                Stripe Customer ID
              </label>
              <div className="relative mt-1.5 rounded-md shadow-sm">
                <input
                  type="text"
                  className={cn(
                    "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                    errors.stripeCustomerId &&
                      "border-red-600 focus:border-red-500 focus:ring-red-600",
                  )}
                  placeholder="cus_NffrFeUfNV2Hib"
                  {...register("stripeCustomerId", {
                    required: false,
                  })}
                />
              </div>
              {errors.stripeCustomerId && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.stripeCustomerId.message}
                </p>
              )}
              <p className="mt-1 text-xs text-neutral-500">
                The customer's Stripe Customer ID (optional)
              </p>
            </div>
          </div>

          <div className="border-border-subtle flex items-center justify-end gap-2 border-t px-5 py-4">
            <Button
              variant="secondary"
              className="h-8 w-fit px-3"
              text="Cancel"
              shortcut="C"
              onClick={() => {
                setShowModal(false);
                reset();
              }}
            />
            <Button
              type="submit"
              variant="primary"
              className="h-8 w-fit px-3"
              text="Closed won"
              shortcut="W"
              loading={isPending || isSubmitting}
            />
          </div>
        </form>
      </Modal>
    );
  }, [showModal, handleSubmit, onSubmit, register, errors, isPending, isSubmitting, reset]);

  return useMemo(
    () => ({
      setShowModal,
      ClosedWonModal: ModalComponent,
      isMarkingClosedWon: isPending || isSubmitting,
    }),
    [setShowModal, ModalComponent, isPending, isSubmitting],
  );
}
