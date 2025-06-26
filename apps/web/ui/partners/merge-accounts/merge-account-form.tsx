import { mergePartnerAccountsAction } from "@/lib/actions/partners/merge-partner-accounts";
import { Button } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { useMergePartnerAccountsForm } from "./form-context";

export function MergeAccountForm({ onSuccess }: { onSuccess: () => void }) {
  const { sourceAccount, targetAccount } = useMergePartnerAccountsForm();

  console.info("sourceAccount", sourceAccount);
  console.info("targetAccount", targetAccount);

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
    <form onSubmit={onSubmit} className="space-y-6">
      MergeAccountForm
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="secondary"
          text="Cancel"
          className="h-8 w-fit px-3"
          disabled={isPending}
        />
        <Button
          text="Merge accounts"
          className="h-8 w-fit px-3"
          type="submit"
          disabled={isPending}
          loading={isPending}
        />
      </div>
    </form>
  );
}
