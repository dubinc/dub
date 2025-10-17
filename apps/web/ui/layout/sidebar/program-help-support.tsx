"use client";

import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { ProgramHelpLinks } from "@/ui/partners/program-help-links";
import { memo } from "react";

export const ProgramHelpSupport = memo(() => {
  const { programEnrollment } = useProgramEnrollment();

  if (!programEnrollment?.program) return null;

  const { program } = programEnrollment;

  return (
    <div className="border-border-default grid gap-2 border-t p-3">
      <div className="text-content-default px-2 text-sm font-semibold">
        {program.name.length <= 12 ? `${program.name} ` : ""}
        Program Support
      </div>
      <ProgramHelpLinks />
    </div>
  );
});
