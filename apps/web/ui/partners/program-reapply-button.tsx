"use client";

import { getReapplyStatus } from "@/lib/program-applications/reapplication";
import { PartnerProfileProgramEnrollmentProps } from "@/lib/types";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
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
    | "status"
    | "reapplicationTimeframe"
    | "application"
    | "program"
    | "groupSlug"
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
        onClick={() => router.push(getReapplyUrl(programEnrollment))}
      />
    </div>
  );
}

// The application form of the group that rejected the partner. The form page
// falls back to the default group, or to the marketplace page, when the form
// is not published.
function getReapplyUrl({
  program,
  groupSlug,
}: Pick<PartnerProfileProgramEnrollmentProps, "program" | "groupSlug">) {
  return groupSlug && groupSlug !== DEFAULT_PARTNER_GROUP.slug
    ? `/${program.slug}/${groupSlug}/apply`
    : `/${program.slug}/apply`;
}
