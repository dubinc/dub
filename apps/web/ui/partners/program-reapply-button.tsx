"use client";

import { getReapplyStatus } from "@/lib/program-applications/reapplication";
import { PartnerProfileProgramEnrollmentProps } from "@/lib/types";
import { Button } from "@dub/ui";
import { cn } from "@dub/utils";
import { useRouter } from "next/navigation";
import { type SyntheticEvent } from "react";

export function ProgramReapplyButton({
  programEnrollment,
  className,
}: {
  programEnrollment: Pick<
    PartnerProfileProgramEnrollmentProps,
    "status" | "reapplicationTimeframe" | "application" | "program"
  >;
  className?: string;
}) {
  const router = useRouter();
  const { canReapply, blockedReason } = getReapplyStatus(programEnrollment);

  if (programEnrollment.status !== "rejected") {
    return null;
  }

  // the button sits in a table row or a card that opens the program, so a
  // click, also on the disabled button, must not reach them
  const stopClick = (e: SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className={cn("w-fit", className)} onClick={stopClick}>
      <Button
        text="Reapply"
        className="h-7 w-fit px-2.5 text-xs"
        disabledTooltip={canReapply ? undefined : blockedReason}
        onClick={() =>
          router.push(`/programs/${programEnrollment.program.slug}/apply`)
        }
      />
    </div>
  );
}
