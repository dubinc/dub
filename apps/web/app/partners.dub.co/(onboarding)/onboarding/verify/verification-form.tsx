"use client";

import { resendVerificationCodeAction } from "@/lib/actions/partners/resend-verification-code";
import { verifyPartnerAction } from "@/lib/actions/partners/verify-partner";
import useDotsUser from "@/lib/swr/use-dots-user";
import { Button, LoadingSpinner, useMediaQuery } from "@dub/ui";
import { MobilePhone } from "@dub/ui/src/icons";
import { cn } from "@dub/utils/src/functions";
import { OTPInput } from "input-otp";
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
    handleSubmit,
    reset,
    getValues,
    setValue,
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
    <div className="grid gap-2">
      <form
        onSubmit={handleSubmit((data) => executeAsync({ partnerId, ...data }))}
        className="grid gap-4 text-left"
      >
        <label>
          <span className="text-sm font-medium text-gray-800">
            Verification code
          </span>
          <OTPInput
            maxLength={6}
            autoFocus={!isMobile}
            containerClassName="mt-2 group flex items-center justify-center"
            required
            value={getValues("code")}
            onChange={(code) => {
              reset({ code });
              setValue("code", code);
            }}
            render={({ slots }) => (
              <div className="flex items-center">
                {slots.map(({ char, isActive, hasFakeCaret }, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "relative flex h-16 w-[3.25rem] items-center justify-center text-xl sm:h-20 sm:w-16",
                      "border-y border-r border-gray-200 bg-white first:rounded-l-lg first:border-l last:rounded-r-lg",
                      "ring-0 transition-all",
                      isActive &&
                        "z-10 border border-gray-500 ring-2 ring-gray-200",
                      errors.code && "border-red-500 ring-red-200",
                    )}
                  >
                    {char}
                    {hasFakeCaret && (
                      <div className="animate-caret-blink pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="h-5 w-px bg-black" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            onComplete={handleSubmit((data) =>
              executeAsync({ partnerId, ...data }),
            )}
          />
          {errors.code && (
            <p className="mt-2 text-center text-sm text-red-500">
              Invalid code. Please try again.
            </p>
          )}
        </label>

        <Button
          type="submit"
          text="Submit code"
          loading={isExecuting || isSubmitting || isSubmitSuccessful}
        />
      </form>
      <ResendCode />
    </div>
  );
}

function ResendCode() {
  const searchParams = useSearchParams();
  const partnerId = searchParams.get("partner") ?? "";
  const { dotsUser } = useDotsUser();
  const { executeAsync, isExecuting } = useAction(
    resendVerificationCodeAction,
    {
      onSuccess: () => {
        toast.success("Code resent successfully");
      },
    },
  );
  return (
    <div className="flex items-center justify-between">
      {!dotsUser ? (
        <div className="h-4 w-20 animate-pulse rounded-md bg-gray-200" />
      ) : (
        <div className="flex items-center gap-1 text-sm text-gray-400">
          <MobilePhone className="size-4" />+
          {dotsUser?.phone_number.country_code}
          {dotsUser?.phone_number.phone_number}
        </div>
      )}
      <button
        className={cn(
          "flex w-fit items-center gap-2 text-sm text-gray-400 hover:text-gray-600",
          isExecuting && "cursor-not-allowed opacity-50",
        )}
        onClick={() => executeAsync({ partnerId })}
        disabled={isExecuting}
      >
        <LoadingSpinner
          className={cn(
            "size-3 transition-opacity",
            !isExecuting && "opacity-0",
          )}
        />
        Resend code
      </button>
    </div>
  );
}
