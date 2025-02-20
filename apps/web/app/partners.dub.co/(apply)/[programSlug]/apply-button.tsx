"use client";

import { Button } from "@dub/ui";
import Link from "next/link";

export function ApplyButton({ programSlug }: { programSlug: string }) {
  return (
    <Link href={`/${programSlug}/apply`}>
      <Button
        type="button"
        text="Apply today"
        className="border-[var(--brand)] bg-[var(--brand)] hover:bg-[var(--brand)] hover:ring-[var(--brand-ring)]"
      />
    </Link>
  );
}
