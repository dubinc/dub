"use client";

import { Wordmark } from "@dub/ui";
import { cn } from "@dub/utils";
import { useParams } from "next/navigation";

export function DubPartnersLogo() {
  const { programSlug } = useParams();
  return (
    <a
      href="https://dub.co/partners"
      target="_blank"
      className={cn(
        "absolute left-1/2 top-4 z-10 flex -translate-x-1/2 flex-col items-center",
        programSlug && "top-[68px]",
      )}
    >
      <Wordmark className="h-8" />
      <span className="text-sm font-medium text-neutral-700">Partners</span>
    </a>
  );
}
