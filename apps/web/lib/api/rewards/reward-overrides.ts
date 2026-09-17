import { ProgramEnrollment } from "@prisma/client";

export type EnrollmentRewardIds = Pick<
  ProgramEnrollment,
  "clickRewardId" | "leadRewardId" | "saleRewardId" | "discountId"
>;

export type EnrollmentRewardIdsInput = Partial<EnrollmentRewardIds>;

// True when any reward/discount field was sent, including explicit null clears.
export const hasRewardIdsInput = ({
  clickRewardId,
  leadRewardId,
  saleRewardId,
  discountId,
}: EnrollmentRewardIdsInput) => {
  return (
    clickRewardId !== undefined ||
    leadRewardId !== undefined ||
    saleRewardId !== undefined ||
    discountId !== undefined
  );
};

// True when any field assigns a non-null reward/discount id (not a clear).
export const hasRewardAssignment = ({
  clickRewardId,
  leadRewardId,
  saleRewardId,
  discountId,
}: EnrollmentRewardIdsInput) => {
  return [clickRewardId, leadRewardId, saleRewardId, discountId].some(
    (id) => id !== undefined && id !== null,
  );
};
