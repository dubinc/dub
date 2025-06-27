import { mergePartnerAccountsAction } from "@/lib/actions/partners/merge-partner-accounts";
import { Button } from "@dub/ui";
import { ArrowDown } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { AccountInputGroup } from "./account-input-group";
import { useMergePartnerAccountsForm } from "./form-context";

export function MergeAccountForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { sourceAccount, targetAccount } = useMergePartnerAccountsForm();

  const { executeAsync, isPending } = useAction(mergePartnerAccountsAction, {
    onSuccess: async () => {
      onSuccess();
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
                `https://api.dub.co/og/avatar?seed=${sourceAccount.email}`
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
                `https://api.dub.co/og/avatar?seed=${targetAccount.email}`
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
      </div>

      <div className="flex items-center justify-end gap-2">
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
    </form>
  );
}
