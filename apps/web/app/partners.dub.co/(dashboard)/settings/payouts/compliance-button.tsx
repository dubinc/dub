import { createAccountLinkAction } from "@/lib/actions/partners/create-account-link";
import { Button } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

export const ComplianceButton = () => {
  const { executeAsync, isExecuting } = useAction(createAccountLinkAction, {
    onSuccess({ data }) {
      if (!data?.url) {
        toast.error("Unable to create account link. Please contact support.");
        return;
      }

      window.open(data.url, "_blank");
    },
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  return (
    <Button
      text="Submit"
      variant="secondary"
      onClick={async () => await executeAsync()}
      loading={isExecuting}
      className="h-8 w-fit px-2"
    />
  );
};
