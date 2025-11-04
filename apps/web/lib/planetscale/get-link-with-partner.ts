import { punyEncode } from "@dub/utils";
import {
  decodeKeyIfCaseSensitive,
  encodeKey,
  isCaseSensitiveDomain,
} from "../api/links/case-sensitivity";
import { conn } from "./connection";
import { EdgeLinkProps } from "./types";

interface QueryResult extends EdgeLinkProps {
  partner?: {
    id: string;
    name: string;
    image: string | null;
  } | null;
  discount?: {
    id: string;
    amount: number;
    type: "percentage" | "flat";
    maxDuration: number | null;
  } | null;
}

export const getLinkWithPartner = async ({
  domain,
  key,
}: {
  domain: string;
  key: string;
}): Promise<QueryResult | null> => {
  const keyToQuery = isCaseSensitiveDomain(domain)
    ? encodeKey(key)
    : punyEncode(decodeURIComponent(key));

  console.time("getLinkWithPartner");

  const { rows } =
    (await conn.execute(
      `SELECT 
        Link.*,
        Partner.id as partnerId,
        Partner.name as partnerName,
        Partner.image as partnerImage,
        PartnerDiscount.id as discountId,
        PartnerDiscount.amount as discountAmount,
        PartnerDiscount.type as discountType,
        PartnerDiscount.maxDuration as discountMaxDuration,
        PartnerDiscount.couponId as discountCouponId,
        PartnerDiscount.couponTestId as discountCouponTestId
       FROM Link
       LEFT JOIN ProgramEnrollment ON ProgramEnrollment.programId = Link.programId AND ProgramEnrollment.partnerId = Link.partnerId
       LEFT JOIN Partner ON Partner.id = ProgramEnrollment.partnerId
       LEFT JOIN Discount PartnerDiscount ON ProgramEnrollment.discountId = PartnerDiscount.id
       LEFT JOIN Program ON Program.id = Link.programId
       WHERE Link.domain = ? AND Link.key = ?`,
      [domain, keyToQuery],
    )) || {};

  console.timeEnd("getLinkWithPartner");

  const link =
    rows && Array.isArray(rows) && rows.length > 0 ? (rows[0] as any) : null;

  if (!link) {
    return null;
  }

  const {
    partnerId,
    partnerName,
    partnerImage,
    discountId,
    discountAmount,
    discountType,
    discountMaxDuration,
    discountCouponId,
    discountCouponTestId,
    ...rest
  } = link;

  return {
    ...rest,
    partnerId,
    key: decodeKeyIfCaseSensitive({ domain, key }),
    partner: partnerId
      ? {
          id: partnerId,
          name: partnerName,
          image: partnerImage,
        }
      : null,
    discount:
      discountId && discountAmount
        ? {
            id: discountId,
            amount: discountAmount,
            type: discountType,
            maxDuration: discountMaxDuration,
            couponId: discountCouponId,
            couponTestId: discountCouponTestId,
          }
        : null,
  };
};
