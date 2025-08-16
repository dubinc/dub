"use client";

import { cn } from "@dub/utils";
import { useSearchParams } from "next/navigation";

export function EnterpriseLink() {
  const searchParams = useSearchParams();
  const recommendedPlan = searchParams.get("plan");

  return (
    <a
      href="https://dub.co/enterprise"
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center text-neutral-500 underline-offset-4 transition-colors hover:text-neutral-800 hover:underline",
        recommendedPlan === "enterprise" &&
          "font-medium text-blue-600 hover:text-blue-800",
      )}
    >
      Looking for enterprise? ↗
    </a>
  );
}
