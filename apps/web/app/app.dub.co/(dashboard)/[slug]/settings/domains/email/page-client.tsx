"use client";

import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { ArrowTurnRight2 } from "@dub/ui";
import { Mail } from "lucide-react";

export function EmailDomains() {
  return (
    <>
      <div className="grid gap-5">
        <div className="animate-fade-in">
          <AnimatedEmptyState
            title="No email domains found"
            description="Add email domains for branded partner communications"
            cardContent={
              <>
                <Mail className="size-4 text-neutral-700" />
                <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
                <div className="xs:flex hidden grow items-center justify-end gap-1.5 text-neutral-500">
                  <ArrowTurnRight2 className="size-3.5" />
                </div>
              </>
            }
            pillContent="Coming soon"
          />
        </div>
      </div>
    </>
  );
}
