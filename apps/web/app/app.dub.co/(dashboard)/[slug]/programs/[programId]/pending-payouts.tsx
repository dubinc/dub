import { buttonVariants } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";

export function PendingPayouts() {
  const { slug, programId } = useParams();

  return (
    <div className="rounded-md border border-neutral-200">
      <div className="mb-4 flex items-center justify-between border-b border-neutral-200 p-5">
        <h2 className="text-base font-semibold text-neutral-900">
          Pending payouts
        </h2>

        <Link
          href={`/${slug}/programs/${programId}/payouts?status=pending`}
          className={cn(
            buttonVariants(),
            "flex h-8 items-center rounded-lg border px-3 text-sm",
          )}
        >
          View all
        </Link>
      </div>
    </div>
  );
}
