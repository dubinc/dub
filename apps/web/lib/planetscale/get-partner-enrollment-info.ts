import { conn } from "./connection";

interface QueryResult {
  id: string;
  name: string;
  image: string | null;
  discountId: string;
  amount: number;
  type: "percentage" | "flat";
  maxDuration: number | null;
  couponId: string | null;
  couponTestId: string | null;
  groupId: string | null;
  partnerTagIds: string | null;
}

// Get enrollment info for a partner in a program
export const getPartnerEnrollmentInfo = async ({
  partnerId,
  programId,
}: {
  partnerId: string | null;
  programId: string | null;
}) => {
  if (!partnerId || !programId) {
    return {
      partner: null,
      group: null,
      discount: null,
    };
  }

  const { rows } = await conn.execute<QueryResult>(
    `SELECT
      Partner.id,
      Partner.name,
      Partner.image,
      Discount.id AS discountId,
      Discount.amount,
      Discount.type,
      Discount.maxDuration,
      Discount.couponId,
      Discount.couponTestId,
      ProgramEnrollment.groupId,
      GROUP_CONCAT(DISTINCT ProgramPartnerTag.partnerTagId SEPARATOR ',') as partnerTagIds
    FROM
      ProgramEnrollment
      LEFT JOIN Partner ON Partner.id = ProgramEnrollment.partnerId
      LEFT JOIN Discount ON Discount.id = ProgramEnrollment.discountId
      LEFT JOIN ProgramPartnerTag ON ProgramPartnerTag.programId = ProgramEnrollment.programId
      AND ProgramPartnerTag.partnerId = ProgramEnrollment.partnerId
    WHERE
      ProgramEnrollment.partnerId = ?
      AND ProgramEnrollment.programId = ?
    GROUP BY ProgramEnrollment.programId, ProgramEnrollment.partnerId`,
    [partnerId, programId],
  );

  const result =
    rows && Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

  if (!result) {
    return {
      partner: null,
      group: null,
      discount: null,
      partnerTagIds: null,
    };
  }

  return {
    partner: {
      id: result.id,
      name: result.name,
      image: result.image,
    },
    group: {
      id: result.groupId,
    },
    discount: result.discountId
      ? {
          id: result.discountId,
          amount: result.amount,
          type: result.type,
          maxDuration: result.maxDuration,
          couponId: result.couponId,
          couponTestId: result.couponTestId,
        }
      : null,
    partnerTagIds: result.partnerTagIds
      ? (result.partnerTagIds.split(",").filter(Boolean) as string[])
      : null,
  };
};
