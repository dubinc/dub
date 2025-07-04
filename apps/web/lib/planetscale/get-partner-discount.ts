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

  console.time("getPartnerAndDiscount");

  const { rows } = await conn.execute<QueryResult>(
    `SELECT 
      Partner.id,
      Partner.name,
      Partner.image,
      Discount.id as discountId,
      Discount.amount as amount,
      Discount.type as type,
      Discount.maxDuration as maxDuration,
      Discount.couponId as couponId,
      Discount.couponTestId as couponTestId
    FROM ProgramEnrollment
    LEFT JOIN Partner ON Partner.id = ProgramEnrollment.partnerId
    LEFT JOIN Discount ON Discount.id = ProgramEnrollment.discountId
    WHERE ProgramEnrollment.partnerId = ? AND ProgramEnrollment.programId = ? LIMIT 1`,
    [partnerId, programId],
  );

  console.timeEnd("getPartnerAndDiscount");

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
