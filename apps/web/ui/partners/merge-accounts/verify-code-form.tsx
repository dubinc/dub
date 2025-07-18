"use client";

import { mergePartnerAccountsAction } from "@/lib/actions/partners/merge-partner-accounts";
import { AccountInputGroup } from "@/ui/partners/merge-accounts/account-input-group";
import { useMergePartnerAccountsForm } from "@/ui/partners/merge-accounts/form-context";
import { OTPInputField } from "@/ui/partners/merge-accounts/otp-input-field";
import { Button } from "@dub/ui";
import { ArrowDown } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { StepProgressBar } from "./step-progress-bar";

export function VerifyCodeForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
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
        We sent a 6-digit code to both emails.
      </p>

      {/* Didn't receive them? Resend codes. */}

      <div className="flex flex-col gap-6">
        <AccountInputGroup title="Source account">
          <div className="flex flex-col gap-4">
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

            <OTPInputField
              label="Verification code"
              value={sourceCode}
              onChange={(code) => {
                setValue("sourceCode", code);
              }}
            />
          </div>
        </AccountInputGroup>

        <div className="flex items-start px-7">
          <ArrowDown className="size-5" aria-hidden="true" />
        </div>

        <AccountInputGroup title="Target account">
          <div className="flex flex-col gap-4">
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

            <OTPInputField
              label="Verification code"
              value={targetCode}
              onChange={(code) => {
                setValue("targetCode", code);
              }}
            />
          </div>
        </AccountInputGroup>
      </div>

      <div className="flex items-center justify-between gap-4">
        <StepProgressBar step={2} />

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            text="Cancel"
            className="h-8 w-fit px-3"
            disabled={isPending || isSubmitting}
            onClick={onCancel}
          />
          <Button
            text="Verify accounts"
            className="h-8 w-fit px-3"
            type="submit"
            disabled={sourceCode.length !== 6 || targetCode.length !== 6}
            loading={isPending || isSubmitting}
          />
        </div>
      </div>
    </form>
  );
}
