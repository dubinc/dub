"use client";

import { verifyPartnerAction } from "@/lib/actions/partners/verify-partner";
import { Button, useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils/src/functions";
import { useAction } from "next-safe-action/hooks";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export function VerificationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const partnerId = searchParams.get("partner") ?? "";
  const { isMobile } = useMediaQuery();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<{ code: string }>();

  const { executeAsync, isExecuting } = useAction(verifyPartnerAction, {
    onSuccess: ({ data }) => {
      if (!data?.partnerId) {
        toast.error("Failed to verify partner. Please try again.");
        return;
      }
      router.push(`/${data.partnerId}`);
    },
    onError: ({ error, input }) => {
      toast.error(error.serverError?.serverError);
      reset(input);
    },
  });

  return (
    <form
      onSubmit={handleSubmit((data) => executeAsync({ partnerId, ...data }))}
      className="flex w-full flex-col gap-4 text-left"
    >
      <label>
        <span className="text-sm font-medium text-gray-800">
          Verification code
        </span>
        <input
          type="text"
          className={cn(
            "mt-2 block w-full rounded-md focus:outline-none sm:text-sm",
            errors.code
              ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:ring-gray-500",
          )}
          autoFocus={!isMobile}
          {...register("code", {
            required: true,
          })}
        />
      </label>

      <Button
        type="submit"
        text="Submit code"
        className="mt-2"
        loading={isExecuting || isSubmitting || isSubmitSuccessful}
      />
    </form>
  );
}
