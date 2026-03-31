"use client";

import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramProps } from "@/lib/types";
import { ArrowUpRight2, Button, SquareCheck, UserCheck } from "@dub/ui";
import { cn } from "@dub/utils";
import { useEffect } from "react";

const PROGRAM_TERMS_CHANNEL = "program-terms-updated";

export default function ProgramTermsPreview() {
  const { slug } = useWorkspace();
  const { program, mutate } = useProgram(
    {},
    { dedupingInterval: 5000, revalidateOnFocus: true },
  );

  // Listen for cross-tab updates from the resources page
  useEffect(() => {
    const channel = new BroadcastChannel(PROGRAM_TERMS_CHANNEL);
    channel.onmessage = (event) => {
      const termsUrl = event.data?.termsUrl ?? null;
      // Optimistically update the cache, then revalidate in background
      mutate(
        (current) =>
          current ? ({ ...current, termsUrl } as ProgramProps) : current,
        { revalidate: true },
      );
    };
    return () => channel.close();
  }, [mutate]);

  const hasTerms = Boolean(program?.termsUrl);
  const resourcesUrl = `/${slug}/program/resources`;

  return (
    <div
      className={cn(
        "rounded-xl px-1 pb-1.5 pt-1",
        hasTerms ? "bg-blue-50" : "bg-amber-100",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center gap-2 rounded-lg border py-2",
          hasTerms
            ? "border-blue-200 bg-blue-100"
            : "border-amber-100 bg-amber-50",
        )}
      >
        <div className="flex items-center gap-1">
          <SquareCheck
            className={cn(
              "size-4",
              hasTerms ? "text-blue-900" : "text-amber-900",
            )}
          />
          <span
            className={cn(
              "text-sm font-medium",
              hasTerms ? "text-blue-900" : "text-amber-900",
            )}
          >
            Program terms agreement
          </span>
        </div>
        <Button
          type="button"
          variant={hasTerms ? "secondary" : "primary"}
          text={hasTerms ? "Edit link" : "Add link"}
          right={<ArrowUpRight2 className="size-3" />}
          className={cn(
            "h-6 w-fit gap-1 px-1.5 text-xs",
            hasTerms && "border-blue-200",
          )}
          onClick={() => window.open(resourcesUrl, "_blank")}
        />
      </div>
      <div className="mt-1 flex items-center justify-center gap-1">
        <UserCheck
          className={cn(
            "size-3.5",
            hasTerms ? "text-blue-900" : "text-amber-500",
          )}
        />
        <span
          className={cn(
            "text-xs font-medium",
            hasTerms ? "text-blue-900" : "text-amber-900",
          )}
        >
          Required applicant field
        </span>
      </div>
    </div>
  );
}

export { PROGRAM_TERMS_CHANNEL };
