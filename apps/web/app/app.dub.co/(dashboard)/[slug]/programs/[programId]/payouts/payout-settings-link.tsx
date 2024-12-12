"use client";

import { buttonVariants } from "@dub/ui";
import { GreekTemple } from "@dub/ui/icons";
import { Tooltip } from "@dub/ui/src/tooltip";
import { cn } from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";

export function PayoutsSettingsLink() {
  const { slug } = useParams() as { slug: string };
  return (
    <Tooltip content="Payout settings">
      <Link
        href={`/${slug}/settings/payouts`}
        className={cn(
          buttonVariants({ variant: "secondary" }),
          "flex h-10 items-center rounded-lg border px-3 text-sm",
        )}
      >
        <GreekTemple className="size-4" />
      </Link>
    </Tooltip>
  );
}
