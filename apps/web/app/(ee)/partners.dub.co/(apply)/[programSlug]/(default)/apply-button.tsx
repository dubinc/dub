"use client";

import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { Button } from "@dub/ui";
import Link from "next/link";

export function ApplyButton({
  programSlug,
  groupSlug,
}: {
  programSlug: string;
  groupSlug: string;
}) {
  const partnerGroupSlug =
    groupSlug === DEFAULT_PARTNER_GROUP.slug ? "" : `/${groupSlug}`;

  return (
    <Link href={`/${programSlug}${partnerGroupSlug}/apply`}>
      <Button
        type="button"
        text="Apply today"
        className="border-[var(--brand)] bg-[var(--brand)] hover:bg-[var(--brand)] hover:ring-[var(--brand-ring)]"
      />
    </Link>
  );
}
