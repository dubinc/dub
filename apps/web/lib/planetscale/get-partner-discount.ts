import { conn } from "./connection";

interface QueryResult {
  id: string;
  name: string;
  image: string | null;
  discountId: string;
  amount: number;
  type: "percentage" | "flat";
  maxDuration: number | null;
}

// Get partner and discount info for a partner link
export const getPartnerAndDiscount = async ({
  partnerId,
  programId,
}: {
  partnerId: string;
  programId: string;
}) => {
  console.time("getPartnerAndDiscount");

  const { rows } = await conn.execute<QueryResult>(
    `SELECT 
      Partner.id,
      Partner.name,
      Partner.image,
      COALESCE(Discount.id, ProgramDiscount.id) as discountId,
      COALESCE(Discount.amount, ProgramDiscount.amount) as amount,
      COALESCE(Discount.type, ProgramDiscount.type) as type,
      COALESCE(Discount.maxDuration, ProgramDiscount.maxDuration) as maxDuration
    FROM ProgramEnrollment
    LEFT JOIN Partner ON Partner.id = ProgramEnrollment.partnerId
    LEFT JOIN Discount ON Discount.id = ProgramEnrollment.discountId
    LEFT JOIN Discount ProgramDiscount ON ProgramDiscount.id = (
      SELECT defaultDiscountId FROM Program WHERE id = ProgramEnrollment.programId
    )
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
        }
      : null,
  };
};
