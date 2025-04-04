import { punyEncode } from "@dub/utils";
import {
  decodeKeyIfCaseSensitive,
  encodeKey,
  isCaseSensitiveDomain,
} from "../api/links/case-sensitivity";
import { conn } from "./connection";
import { EdgeLinkProps } from "./types";

interface QueryResult extends EdgeLinkProps {
  allowedHostnames: string[];
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

  // TODO:
  // Use inner query for program discount

  const { rows } =
    (await conn.execute(
      `SELECT 
        l.*,
        w.allowedHostnames,
        p.id as partnerId,
        p.name as partnerName,
        p.image as partnerImage,
        COALESCE(partDis.id, pgmDis.id) as discountId,
        COALESCE(partDis.amount, pgmDis.amount) as discountAmount,
        COALESCE(partDis.type, pgmDis.type) as discountType,
        COALESCE(partDis.maxDuration, pgmDis.maxDuration) as discountMaxDuration
       FROM Link l 
       LEFT JOIN ProgramEnrollment pe ON l.programId = pe.programId AND l.partnerId = pe.partnerId
       LEFT JOIN Partner p ON pe.partnerId = p.id
       LEFT JOIN Discount partDis ON pe.discountId = partDis.id
       LEFT JOIN Program prog ON l.programId = prog.id
       LEFT JOIN Discount pgmDis ON prog.defaultDiscountId = pgmDis.id
       LEFT JOIN Project w ON l.projectId = w.id
       WHERE l.domain = ? AND l.key = ?`,
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
    discount: discountId
      ? {
          id: discountId,
          amount: discountAmount,
          type: discountType,
          maxDuration: discountMaxDuration,
        }
      : null,
  };
};
