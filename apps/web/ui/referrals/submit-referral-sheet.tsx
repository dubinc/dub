"use client";

import { createReferralAction } from "@/lib/actions/referrals/create-referral";
import { mutatePrefix } from "@/lib/swr/mutate";
import { referralFormSchema } from "@/lib/zod/schemas/referral-form";
import { X } from "@/ui/shared/icons";
import { Button, LoadingSpinner, Sheet } from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { Dispatch, SetStateAction, useMemo } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod/v4";
import { ReferralForm } from "./referral-form";

interface SubmitReferralSheetProps {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  programId: string;
  referralFormData: z.infer<typeof referralFormSchema>;
  onSuccess?: () => void;
}

type ReferralFormData = {
  formData: Record<string, any>;
};

export function SubmitReferralSheet({
  isOpen,
  setIsOpen,
  programId,
  referralFormData,
  onSuccess,
}: SubmitReferralSheetProps) {
  const validatedFormData = useMemo(() => {
    try {
      return referralFormSchema.parse(referralFormData);
    } catch {
      return null;
    }
  }, [referralFormData]);

  const form = useForm<ReferralFormData>({
    defaultValues: {
      formData: {},
    },
  });

  const {
    handleSubmit,
    setError,
    reset,
    formState: { isSubmitSuccessful },
  } = form;

  const { executeAsync, isPending } = useAction(createReferralAction, {
    onSuccess: () => {
      mutatePrefix("/api/programs/partner-referrals");
      toast.success("Referral submitted successfully");
      reset();
      setIsOpen(false);
      onSuccess?.();
    },
    onError: ({ error }) => {
      toast.error(error.serverError || "Failed to submit referral");
      setError("root.serverError", {
        message: error.serverError || "Failed to submit referral",
      });
    },
  });

  const onSubmit = async (data: ReferralFormData) => {
    if (!validatedFormData) {
      return;
    }

    await executeAsync({
      programId,
      formData: data.formData,
    });
  };

  if (!validatedFormData) {
    return null;
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <FormProvider {...form}>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className={cn(
            "flex h-full flex-col transition-opacity duration-200",
            isSubmitSuccessful && "pointer-events-none opacity-0",
          )}
          {...{
            inert: isSubmitSuccessful,
          }}
        >
          <div className="sticky top-0 z-10 border-b border-neutral-200 bg-neutral-50">
            <div className="flex items-start justify-between p-6">
              <Sheet.Title asChild className="min-w-0">
                <div>
                  <span className="block text-base font-semibold leading-tight text-neutral-900">
                    {validatedFormData.title || "Submit Referral"}
                  </span>
                  {validatedFormData.description && (
                    <p className="mt-1 text-sm text-neutral-500">
                      {validatedFormData.description}
                    </p>
                  )}
                </div>
              </Sheet.Title>
              <Sheet.Close asChild>
                <Button
                  variant="outline"
                  icon={<X className="size-5" />}
                  className="h-auto w-fit p-1"
                />
              </Sheet.Close>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex flex-col gap-6 p-5 sm:p-8">
              <ReferralForm referralFormData={validatedFormData} />
            </div>
          </div>

          <div className="sticky bottom-0 z-10 border-t border-neutral-200 bg-white p-5">
            <Button
              type="submit"
              variant="primary"
              text="Submit Referral"
              loading={isPending}
            />
          </div>
        </form>
        {isSubmitSuccessful && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center">
              <LoadingSpinner />
              <span className="mt-4 block text-base font-semibold text-neutral-900">
                Referral submitted
              </span>
              <p className="mt-2 text-center text-sm text-neutral-500">
                Your referral has been submitted successfully.
              </p>
            </div>
          </div>
        )}
      </FormProvider>
    </Sheet>
  );
}
