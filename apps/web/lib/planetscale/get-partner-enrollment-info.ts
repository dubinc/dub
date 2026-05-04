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
  tenantId: string | null;
  /** JSON array from JSON_ARRAYAGG; driver may return a string or parsed array */
  partnerTagIds: string | string[] | null;
}

function parsePartnerTagIds(
  value: QueryResult["partnerTagIds"],
): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.filter(
      (id): id is string => typeof id === "string" && id.length > 0,
    );
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter(
            (id): id is string => typeof id === "string" && id.length > 0,
          )
        : [];
    } catch {
      return [];
    }
  }
  return [];
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
      ProgramEnrollment.tenantId,
      tagAgg.partnerTagIds
    FROM
      ProgramEnrollment
      LEFT JOIN Partner ON Partner.id = ProgramEnrollment.partnerId
      LEFT JOIN Discount ON Discount.id = ProgramEnrollment.discountId
      LEFT JOIN (
        SELECT
          programId,
          partnerId,
          JSON_ARRAYAGG(partnerTagId) AS partnerTagIds
        FROM (
          SELECT DISTINCT
            programId,
            partnerId,
            partnerTagId
          FROM ProgramPartnerTag
          WHERE programId = ? AND partnerId = ?
        ) AS distinct_program_partner_tags
        GROUP BY programId, partnerId
      ) AS tagAgg
        ON tagAgg.programId = ProgramEnrollment.programId
        AND tagAgg.partnerId = ProgramEnrollment.partnerId
    WHERE
      ProgramEnrollment.partnerId = ?
      AND ProgramEnrollment.programId = ?`,
    [programId, partnerId, partnerId, programId],
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
      tenantId: result.tenantId,
      partnerTagIds: parsePartnerTagIds(result.partnerTagIds),
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
