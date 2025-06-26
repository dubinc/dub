"use client";

import { mergePartnerAccountsAction } from "@/lib/actions/partners/merge-partner-accounts";
import { useMergePartnerAccountsForm } from "@/ui/partners/merge-accounts/form-context";
import { Button } from "@dub/ui";
import { cn } from "@dub/utils";
import { OTPInput } from "input-otp";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export function VerifyCodeForm({ onSuccess }: { onSuccess: () => void }) {
  const { sourceAccount, targetAccount, setSourceAccount, setTargetAccount } =
    useMergePartnerAccountsForm();

  const {
    watch,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      sourceCode: "",
      targetCode: "",
    },
  });

  const [sourceCode, targetCode] = watch(["sourceCode", "targetCode"]);

  const { executeAsync, isPending } = useAction(mergePartnerAccountsAction, {
    onSuccess: async ({ data }) => {
      if (data) {
        setSourceAccount({
          ...data[0],
          email: data[0].email!,
        });

        setTargetAccount({
          ...data[1],
          email: data[1].email!,
        });

        onSuccess();
      }
    },
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  const onSubmit = async () => {
    await executeAsync({
      step: "verify-tokens",
      sourceEmail: sourceAccount.email,
      targetEmail: targetAccount.email,
      sourceCode,
      targetCode,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <p className="text-sm font-medium text-neutral-700">
        We sent a 6-digit code to both emails. Didn’t receive them? Resend
        codes.
      </p>

      <div className="flex flex-col gap-6">
        <div className="rounded-xl border border-solid border-neutral-200 bg-neutral-100 p-1 pt-0">
          <h3 className="px-1.5 py-2 text-xs font-medium leading-4 text-neutral-500">
            Source account
          </h3>

          <div className="flex flex-col gap-4 rounded-lg border border-solid border-neutral-200 bg-white p-3">
            <div>
              <label className="text-sm font-medium leading-5 text-neutral-900">
                Email
              </label>
              <div className="relative mt-2 rounded-md shadow-sm">
                <input
                  disabled
                  className="block w-full rounded-md border-neutral-300 text-neutral-900 disabled:bg-neutral-100 sm:text-sm"
                  defaultValue={sourceAccount.email}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium leading-5 text-neutral-900">
                Verification code
              </label>
              <div className="relative mt-2">
                <OTPInput
                  maxLength={6}
                  value={sourceCode}
                  onChange={(code) => {
                    setValue("sourceCode", code);
                  }}
                  render={({ slots }) => (
                    <div className="flex w-full items-center justify-between">
                      {slots.map(({ char, isActive, hasFakeCaret }, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "relative flex h-14 w-12 items-center justify-center text-xl",
                            "rounded-lg border border-neutral-200 bg-white ring-0 transition-all",
                            isActive &&
                              "z-10 border border-neutral-800 ring-2 ring-neutral-200",
                            // isInvalidCode && "border-red-500 ring-red-200",
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
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-solid border-neutral-200 bg-neutral-100 p-1 pt-0">
          <h3 className="px-1.5 py-2 text-xs font-medium leading-4 text-neutral-500">
            Target account
          </h3>

          <div className="flex flex-col gap-4 rounded-lg border border-solid border-neutral-200 bg-white p-3">
            <div>
              <label className="text-sm font-medium leading-5 text-neutral-900">
                Email
              </label>
              <div className="relative mt-2 rounded-md shadow-sm">
                <input
                  disabled
                  className="block w-full rounded-md border-neutral-300 text-neutral-900 disabled:bg-neutral-100 sm:text-sm"
                  defaultValue={targetAccount.email}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium leading-5 text-neutral-900">
                Verification code
              </label>
              <div className="relative mt-2">
                <OTPInput
                  maxLength={6}
                  value={targetCode}
                  onChange={(code) => {
                    setValue("targetCode", code);
                  }}
                  render={({ slots }) => (
                    <div className="flex w-full items-center justify-between">
                      {slots.map(({ char, isActive, hasFakeCaret }, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "relative flex h-14 w-12 items-center justify-center text-xl",
                            "rounded-lg border border-neutral-200 bg-white ring-0 transition-all",
                            isActive &&
                              "z-10 border border-neutral-800 ring-2 ring-neutral-200",
                            // isInvalidCode && "border-red-500 ring-red-200",
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
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="secondary"
          text="Cancel"
          className="h-8 w-fit px-3"
          disabled={isPending || isSubmitting}
        />
        <Button
          text="Verify accounts"
          className="h-8 w-fit px-3"
          type="submit"
          disabled={sourceCode.length !== 6 || targetCode.length !== 6}
          loading={isPending || isSubmitting}
        />
      </div>
    </form>
  );
}
