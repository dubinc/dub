"use client";
import { buttonVariants } from "@dub/ui";
import { Gear } from "@dub/ui/src/icons";
import { cn } from "@dub/utils";
import Link from "next/link";

export function PayoutsSettingsLink() {
  const partnerId = "pn_DlsZeePb38RVcnrfbD0SrKzB";

  return (
    <Link
      href={`/${partnerId}/settings/payouts`}
      className={cn(
        buttonVariants({ variant: "secondary" }),
        "flex h-10 items-center gap-2 rounded-lg border px-3 text-sm",
      )}
    >
      <Gear className="size-4" />
      Settings
    </Link>
  );
}
