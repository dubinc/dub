"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { buttonVariants, useKeyboardShortcut } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function CreateCampaignButton() {
  const router = useRouter();
  const { slug: workspaceSlug } = useWorkspace();

  useKeyboardShortcut("c", () =>
    router.push(`/${workspaceSlug}/program/campaigns/new`),
  );

  return (
    <>
      <Link
        href={`/${workspaceSlug}/program/campaigns/new`}
        className={cn(
          buttonVariants({ variant: "primary" }),
          "flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-3 text-sm",
        )}
      >
        Create campaign
        <kbd
          className={cn(
            "hidden rounded px-2 py-0.5 text-xs font-light transition-all duration-75 md:inline-block",
            "bg-neutral-700 text-neutral-400 group-hover:bg-neutral-600 group-hover:text-neutral-300",
          )}
        >
          C
        </kbd>
      </Link>
    </>
  );
}
