"use client";

import { Gift } from "@dub/ui/icons";
import Link from "next/link";

export function ReferButton() {
  return (
    <Link
      href="/account/settings/referrals"
      className="animate-fade-in size-4 shrink-0 rounded-full"
    >
      <Gift className="size-4" />
    </Link>
  );
}
