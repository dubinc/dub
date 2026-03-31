import { generateUnsubscribeTokenAction } from "@/lib/actions/generate-unsubscribe-url";
import useUser from "@/lib/swr/use-user";
import { ExpandingArrow, LoadingSpinner } from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";

export default function UpdateSubscription() {
  const router = useRouter();
  const { user } = useUser();

  const { executeAsync, isPending } = useAction(
    generateUnsubscribeTokenAction,
    {
      onSuccess: ({ data }) => {
        if (!data?.token) {
          return;
        }
        router.push(`/unsubscribe/${data.token}`);
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
      disabled={isPending}
      className={cn(
        "group flex items-center gap-x-1 text-sm text-neutral-500 transition-colors hover:text-neutral-700",
        isPending && "cursor-not-allowed",
      )}
    >
      <span className="underline decoration-dotted underline-offset-2">
        Manage email preferences
      </span>{" "}
      {isPending ? (
        <LoadingSpinner className="size-3" />
      ) : (
        <ExpandingArrow className="size-3" />
      )}
    </button>
  );
}
