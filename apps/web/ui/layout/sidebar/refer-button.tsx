"use client";

import { SHOW_EMBEEDED_REFERRALS } from "@/lib/embed/constants";
import { Gift } from "@dub/ui/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function ReferButton() {
  const pathname = usePathname();

  if (pathname === "/account/settings/referrals" || !SHOW_EMBEEDED_REFERRALS) {
    return null;
  }

  return (
    <Link
      href="/account/settings/referrals"
      className="animate-fade-in size-4 shrink-0 rounded-full"
    >
      <Gift className="size-4" />
    </Link>
  );
}
