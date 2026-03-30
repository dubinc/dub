import { ProgramApplicationRejectionReason } from "@dub/prisma/client";

/**
 * Labels for `ProgramApplicationRejectionReason` (Prisma enum values as keys).
 * Kept prisma-free so client components can import safely.
 */
export const PROGRAM_APPLICATION_REJECTION_REASON_LABELS: Record<
  ProgramApplicationRejectionReason,
  string
> = {
  needsMoreDetail: "Application needs more detail",
  doesNotMeetRequirements: "Does not meet requirements",
  notTheRightFit: "Not the right fit",
  other: "Other",
} as const;

export type ProgramApplicationRejectionReasonKey =
  keyof typeof PROGRAM_APPLICATION_REJECTION_REASON_LABELS;

/** Combobox / UI order (first option is the default suggestion). */
export const PROGRAM_APPLICATION_REJECTION_REASON_ORDER = [
  "needsMoreDetail",
  "doesNotMeetRequirements",
  "notTheRightFit",
  "other",
] as const satisfies readonly ProgramApplicationRejectionReasonKey[];

export function getProgramApplicationRejectionReasonLabel(
  reason: string | null | undefined,
): string | null {
  if (!reason) {
    return null;
  }

  return PROGRAM_APPLICATION_REJECTION_REASON_LABELS[reason] ?? null;
}
