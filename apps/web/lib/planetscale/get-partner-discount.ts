import { conn } from "./connection";

interface QueryResult {
  id: string;
  name: string;
  image: string | null;
  groupId: string | null;
  discountId: string;
  amount: number;
  type: "percentage" | "flat";
  maxDuration: number | null;
  couponId: string | null;
  couponTestId: string | null;
}

// Get partner and discount info for a partner link
export const getPartnerAndDiscount = async ({
  partnerId,
  programId,
}: {
  partnerId: string | null;
  programId: string | null;
}) => {
  if (!partnerId || !programId) {
    return {
      partner: null,
      discount: null,
    };
  }

  const { rows } = await conn.execute<QueryResult>(
    `SELECT 
      Partner.id,
      Partner.name,
      Partner.image,
      ProgramEnrollment.groupId,
      Discount.id as discountId,
      Discount.amount,
      Discount.type,
      Discount.maxDuration,
      Discount.couponId,
      Discount.couponTestId
    FROM ProgramEnrollment
    LEFT JOIN Partner ON Partner.id = ProgramEnrollment.partnerId
    LEFT JOIN Discount ON Discount.id = ProgramEnrollment.discountId
    WHERE ProgramEnrollment.partnerId = ? AND ProgramEnrollment.programId = ? LIMIT 1`,
    [partnerId, programId],
  );

  const result =
    rows && Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

  if (!result) {
    return {
      partner: null,
      discount: null,
    };
  }

  return {
    partner: {
      id: result.id,
      name: result.name,
      image: result.image,
      groupId: result.groupId,
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
  };
};
