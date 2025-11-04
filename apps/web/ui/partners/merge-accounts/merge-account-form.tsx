import { mergePartnerAccountsAction } from "@/lib/actions/partners/merge-partner-accounts";
import useUser from "@/lib/swr/use-user";
import { Button } from "@dub/ui";
import { AlertTriangle, ArrowDown } from "lucide-react";
import { signOut } from "next-auth/react";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { AccountInputGroup } from "./account-input-group";
import { useMergePartnerAccountsForm } from "./form-context";
import { StepProgressBar } from "./step-progress-bar";

export function MergeAccountForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { user } = useUser();
  const { sourceAccount, targetAccount } = useMergePartnerAccountsForm();

  const { executeAsync, isPending } = useAction(mergePartnerAccountsAction, {
    onSuccess: async () => {
      onSuccess();

      if (sourceAccount.email === user?.email) {
        toast.success(
          "Account merge process has started! We'll send you an email when it's complete. You'll be logged out automatically.",
        );

        await signOut({
          callbackUrl: "/login",
        });

        return;
      }

      toast.success(
        "Account merge process has started! We'll send you an email when it's complete. No action is required on your part.",
      );
    },
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  const onSubmit = async () => {
    await executeAsync({
      step: "merge-accounts",
    });
  };

  return (
    <form className="space-y-6">
      <div className="flex flex-col gap-4">
        <AccountInputGroup title="Source account">
          <div className="flex items-center gap-4">
            <img
              src={
                sourceAccount.avatarUrl ||
                `https://api.dub.co/og/avatar/${sourceAccount.email}`
              }
              alt={sourceAccount.name}
              className="size-12 rounded-full object-cover"
            />
            <div>
              <div className="text-base font-semibold leading-4 text-neutral-900">
                {sourceAccount.name}
              </div>
              <div className="mt-1 text-sm font-medium leading-5 text-neutral-500">
                {sourceAccount.email}
              </div>
            </div>
          </div>
        </AccountInputGroup>

        <div className="flex items-start px-7">
          <ArrowDown className="size-5" aria-hidden="true" />
        </div>

        <AccountInputGroup title="Target account">
          <div className="flex items-center gap-4">
            <img
              src={
                targetAccount.avatarUrl ||
                `https://api.dub.co/og/avatar/${targetAccount.email}`
              }
              alt={targetAccount.name}
              className="size-12 rounded-full object-cover"
            />
            <div>
              <div className="text-base font-semibold leading-4 text-neutral-900">
                {targetAccount.name}
              </div>
              <div className="mt-1 text-sm font-medium leading-5 text-neutral-500">
                {targetAccount.email}
              </div>
            </div>
          </div>
        </AccountInputGroup>

        <div className="mt-2 flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4">
          <AlertTriangle className="size-4 text-amber-500" />
          <h3 className="text-sm font-semibold leading-5 text-amber-900">
            This action can’t be undone.
          </h3>
          <p className="text-sm font-normal leading-5 text-amber-900">
            All data — including links, commissions, and payouts from{" "}
            {sourceAccount.email} will be merged into {targetAccount.email}.
            <br />
            <br />
            After the merge, {sourceAccount.email} will be permanently deleted.
            If you’re unsure, please contact our support team before proceeding.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <StepProgressBar step={3} />

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            text="Cancel"
            className="h-8 w-fit px-3"
            disabled={isPending}
            onClick={onCancel}
          />
          <Button
            text="Merge accounts"
            className="h-8 w-fit px-3"
            type="button"
            onClick={onSubmit}
            disabled={isPending}
            loading={isPending}
          />
        </div>
      </div>
    </form>
  );
}
