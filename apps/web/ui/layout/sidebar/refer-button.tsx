"use client";

import { Gift } from "@dub/ui/icons";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function ReferButton() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (
    !session?.user?.["dubPartnerId"] ||
    pathname === "/account/settings/referrals"
  ) {
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
