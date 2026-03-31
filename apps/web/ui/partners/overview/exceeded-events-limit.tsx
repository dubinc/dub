"use client";
import useWorkspace from "@/lib/swr/use-workspace";
import { Lock } from "@dub/ui";
import Link from "next/link";

export function ExceededEventsLimit() {
  const { slug } = useWorkspace();
  return (
    <div className="mx-auto flex size-full max-w-xs flex-col items-center justify-center gap-2">
      <Lock className="text-content-subtle size-6" />
      <h1 className="text-content-emphasis text-sm font-medium">
        Stats Locked
      </h1>
      <p className="text-content-subtle text-center text-sm">
        You have exceeded the events limit on your current plan.{" "}
        <Link
          href={`/${slug}/settings/billing`}
          className="hover:text-content-emphasis underline decoration-dotted underline-offset-2 transition-colors"
        >
          Upgrade to keep using Dub.
        </Link>
      </p>
    </div>
  );
}
