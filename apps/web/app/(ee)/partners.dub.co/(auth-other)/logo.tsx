"use client";

import { DubPartnersLogo } from "@/ui/dub-partners-logo";
import { cn } from "@dub/utils";
import { useParams } from "next/navigation";

export function Logo({ className }: { className?: string }) {
  const { programSlug } = useParams();

  return (
    <DubPartnersLogo
      className={cn(
        "absolute left-1/2 top-4 z-10 -translate-x-1/2",
        programSlug && "top-20",
        className,
      )}
    />
  );
}
