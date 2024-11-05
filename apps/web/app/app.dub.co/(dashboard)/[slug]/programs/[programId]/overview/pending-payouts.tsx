"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { buttonVariants } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";

export function PendingPayouts() {
  const { slug } = useWorkspace();
  const { programId } = useParams();

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-neutral-900">
          Pending payouts
        </h2>

        <Link
          href={`/${slug}/programs/${programId}/payouts`}
          className={cn(
            buttonVariants(),
            "flex h-8 items-center rounded-lg border px-3 text-sm",
          )}
        >
          View all
        </Link>
      </div>

      <div className="min-h-[200px] rounded-md border"></div>
    </>
  );
}
