import { BountySubmissionExtendedSchema } from "@/lib/zod/schemas/bounties";

// Transforms a bounty submission with includes to match BountySubmissionExtendedSchema format.
// Merges partner and programEnrollment data into a single partner object.
export function transformBountySubmission<
  T extends {
    partner: any;
    programEnrollment: any;
    commission: any;
    user: any;
    [key: string]: any;
  },
>(submission: T) {
  const { partner, programEnrollment, commission, user, ...submissionData } =
    submission;

  return BountySubmissionExtendedSchema.parse({
    ...submissionData,
    partner: {
      ...partner,
      ...(programEnrollment || {}),
      id: partner.id,
      status: programEnrollment?.status ?? null,
    },
    commission,
    user,
  });
}
