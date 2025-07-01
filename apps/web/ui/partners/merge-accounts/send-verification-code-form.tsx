"use client";

import { mergePartnerAccountsAction } from "@/lib/actions/partners/merge-partner-accounts";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { AccountInputGroup } from "@/ui/partners/merge-accounts/account-input-group";
import { useMergePartnerAccountsForm } from "@/ui/partners/merge-accounts/form-context";
import { Button } from "@dub/ui";
import { ArrowDown } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { StepProgressBar } from "./step-progress-bar";

export function SendVerificationCodeForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { partner } = usePartnerProfile();
  const { setSourceAccount, setTargetAccount } = useMergePartnerAccountsForm();

  const {
    watch,
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      sourceEmail: partner?.email || "",
      targetEmail: "",
    },
  });

  const [sourceEmail, targetEmail] = watch(["sourceEmail", "targetEmail"]);

  const { executeAsync, isPending } = useAction(mergePartnerAccountsAction, {
    onSuccess: async () => {
      onSuccess();
    },
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  useEffect(() => {
    setSourceAccount((prev) => ({ ...prev, email: sourceEmail }));
  }, [sourceEmail, setSourceAccount]);

  useEffect(() => {
    setTargetAccount((prev) => ({ ...prev, email: targetEmail }));
  }, [targetEmail, setTargetAccount]);

  const onSubmit = async () => {
    await executeAsync({
      step: "send-tokens",
      sourceEmail,
      targetEmail,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <p className="text-sm font-medium text-neutral-700">
        Enter the emails of the accounts you'd like to merge. We'll send a
        verification code to both emails.
      </p>

      <div className="flex flex-col gap-4">
        <AccountInputGroup title="Source account">
          <label className="text-sm font-medium leading-5 text-neutral-900">
            Email
          </label>
          <div className="relative mt-2 rounded-md shadow-sm">
            <input
              type="email"
              required
              autoFocus
              placeholder="Enter source account email"
              className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
              {...register("sourceEmail")}
            />
          </div>
        </AccountInputGroup>

        <div className="flex items-start px-7">
          <ArrowDown className="size-5" aria-hidden="true" />
        </div>

        <AccountInputGroup title="Target account">
          <label className="text-sm font-medium leading-5 text-neutral-900">
            Email
          </label>
          <div className="relative mt-2 rounded-md shadow-sm">
            <input
              type="email"
              required
              placeholder="Enter target account email"
              className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
              {...register("targetEmail")}
            />
          </div>
        </AccountInputGroup>
      </div>

      <div className="flex items-center justify-between gap-4">
        <StepProgressBar step={1} />

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            text="Cancel"
            className="h-8 w-fit px-3"
            disabled={isPending || isSubmitting}
            onClick={onCancel}
          />
          <Button
            text="Send codes"
            className="h-8 w-fit px-3"
            type="submit"
            disabled={!sourceEmail || !targetEmail}
            loading={isPending || isSubmitting}
          />
        </div>
      </div>
    </form>
  );
}
