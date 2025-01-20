"use client";

import { Button } from "@dub/ui";
import { useRouter } from "next/navigation";

export function ApplyButton({ programSlug }: { programSlug: string }) {
  const router = useRouter();

  return (
    <Button
      type="button"
      text="Apply today"
      className="border-[var(--brand)] bg-[var(--brand)] hover:bg-[var(--brand)] hover:ring-[var(--brand-ring)]"
      onClick={() => router.push(`/apply/${programSlug}/application`)}
    />
  );
}
