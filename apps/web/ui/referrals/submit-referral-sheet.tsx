"use client";

import { submitReferralAction } from "@/lib/actions/referrals/submit-referral";
import { mutatePrefix } from "@/lib/swr/mutate";
import { referralFormSchema } from "@/lib/zod/schemas/referral-form";
import { X } from "@/ui/shared/icons";
import { Button, CircleCheckFill, Sheet } from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useParams } from "next/navigation";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
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
  const [isSubmitSuccessful, setIsSubmitSuccessful] = useState(false);
  const { programSlug } = useParams<{ programSlug: string }>();

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

  const { handleSubmit, setError, reset } = form;

  const { executeAsync, isPending } = useAction(submitReferralAction, {
    onSuccess: async () => {
      toast.success("Referral submitted successfully");
      reset();
      setIsSubmitSuccessful(true);
      onSuccess?.();

      if (programSlug) {
        await mutatePrefix([
          `/api/partner-profile/programs/${programSlug}/referrals`,
          `/api/partner-profile/programs/${programSlug}/referrals/count`,
        ]);
      }
    },
    onError: ({ error }) => {
      const errorMessage = error.serverError || "Failed to submit referral";
      toast.error(errorMessage);
      setError("root.serverError", {
        message: errorMessage,
      });
      setIsSubmitSuccessful(false);
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

  // Reset success state when sheet closes
  useEffect(() => {
    if (!isOpen) {
      setIsSubmitSuccessful(false);
    }
  }, [isOpen]);

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
            <div className="flex h-16 items-center justify-between px-6 py-4">
              <Sheet.Title className="text-lg font-semibold">
                Submit Referral
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
            <div className="flex flex-col gap-6 p-5 sm:p-6">
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
          <div className="absolute inset-0 flex items-center justify-center bg-white">
            <div className="flex flex-col items-center">
              <CircleCheckFill className="size-8 text-green-500" />
              <span className="mt-4 block text-base font-semibold text-neutral-900">
                Referral submitted
              </span>
              <p className="mt-2 text-center text-sm text-neutral-500">
                Your referral has been submitted successfully.
              </p>
              <Button
                text="Close"
                variant="primary"
                className="mt-6"
                onClick={() => setIsOpen(false)}
              />
            </div>
          </div>
        )}
      </FormProvider>
    </Sheet>
  );
}
