import { generateUnsubscribeTokenAction } from "@/lib/actions/generate-unsubscribe-url";
import useUser from "@/lib/swr/use-user";
import { LoadingSpinner } from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";

export default function UpdateSubscription() {
  const { user } = useUser();

  const { executeAsync, isExecuting } = useAction(
    generateUnsubscribeTokenAction,
    {
      onSuccess: ({ data }) => {
        if (!data?.token) {
          return;
        }
        window.open(`/unsubscribe/${data.token}`, "_blank");
      },
    },
  );

  if (!user?.email) {
    return <div />;
  }

  return (
    <button
      type="button"
      onClick={() => executeAsync()}
      disabled={isExecuting}
      className={cn(
        "flex items-center gap-x-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-700",
        isExecuting && "cursor-not-allowed",
      )}
    >
      <span className="underline decoration-dotted underline-offset-2">
        Manage email preferences
      </span>{" "}
      {isExecuting ? <LoadingSpinner className="size-3" /> : "↗"}
    </button>
  );
}
