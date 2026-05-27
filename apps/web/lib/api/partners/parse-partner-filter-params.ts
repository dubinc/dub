import { DubApiError } from "@/lib/api/errors";
import { parseFilterValue } from "@dub/utils";
import type * as z from "zod/v4";

const MAX_VALUES = 50;
const APPLICATION_STATUSES = new Set(["pending", "rejected"]);

export type ParsedPartnerFilterOverrides = {
  partnerTagId?: string[];
  partnerTagIdOperator?: "IN" | "NOT IN";
  groupId?: string[];
  groupIdOperator?: "IN" | "NOT IN";
  country?: string[];
  countryOperator?: "IN" | "NOT IN";
  status?: string[];
  statusOperator?: "IN" | "NOT IN";
  referredByPartnerId?: string[];
  referredByPartnerIdOperator?: "IN" | "NOT IN";
};

function parseCategoricalFilter(
  key: string,
  value: string | undefined,
): { values: string[]; sqlOperator: "IN" | "NOT IN" } | undefined {
  const parsed = parseFilterValue(value);
  if (!parsed) return undefined;

  if (parsed.values.length > MAX_VALUES) {
    throw new DubApiError({
      code: "bad_request",
      message: `Filter "${key}" accepts at most ${MAX_VALUES} values.`,
    });
  }

  return parsed;
}

function validateStatusFilter(values: string[]): void {
  if (values.length === 0) return;

  const hasApplication = values.some((v) => APPLICATION_STATUSES.has(v));
  const hasNonApplication = values.some(
    (v) => !APPLICATION_STATUSES.has(v) && v !== "approved_invited",
  );

  if (values.includes("pending") && values.includes("rejected")) {
    throw new DubApiError({
      code: "bad_request",
      message:
        'Status filter cannot combine "pending" and "rejected" in one request.',
    });
  }

  if (hasApplication && hasNonApplication) {
    throw new DubApiError({
      code: "bad_request",
      message:
        "Status filter cannot combine application statuses (pending, rejected) with other partner statuses.",
    });
  }

  if (values.includes("approved_invited") && values.length > 1) {
    throw new DubApiError({
      code: "bad_request",
      message:
        'Status filter cannot combine "approved_invited" with other status values.',
    });
  }
}

export function parsePartnerFilterParams(
  searchParams: Record<string, string | undefined>,
): ParsedPartnerFilterOverrides {
  const partnerTagIdParsed = parseCategoricalFilter(
    "partnerTagId",
    searchParams.partnerTagId,
  );
  const groupIdParsed = parseCategoricalFilter("groupId", searchParams.groupId);
  const countryParsed = parseCategoricalFilter("country", searchParams.country);
  const statusParsed = parseCategoricalFilter("status", searchParams.status);
  const referredByPartnerIdParsed = parseCategoricalFilter(
    "referredByPartnerId",
    searchParams.referredByPartnerId,
  );

  if (statusParsed?.values.length) {
    validateStatusFilter(statusParsed.values);
  }

  return {
    partnerTagId: partnerTagIdParsed?.values,
    partnerTagIdOperator: partnerTagIdParsed?.sqlOperator,
    groupId: groupIdParsed?.values,
    groupIdOperator: groupIdParsed?.sqlOperator,
    country: countryParsed?.values,
    countryOperator: countryParsed?.sqlOperator,
    status: statusParsed?.values,
    statusOperator: statusParsed?.sqlOperator,
    referredByPartnerId: referredByPartnerIdParsed?.values,
    referredByPartnerIdOperator: referredByPartnerIdParsed?.sqlOperator,
  };
}

/** Parse URL filters once, run Zod, attach multi-value arrays + SQL operators. */
export function parsePartnerListQuery<T extends Record<string, unknown>>(
  searchParams: Record<string, string | undefined>,
  schema: z.ZodType<T>,
): T & ParsedPartnerFilterOverrides {
  const filters = parsePartnerFilterParams(searchParams);
  const parsed = schema.parse({
    ...searchParams,
    ...(filters.partnerTagId && { partnerTagId: filters.partnerTagId }),
    ...(filters.groupId !== undefined && { groupId: filters.groupId }),
    ...(filters.country !== undefined && { country: filters.country }),
    ...(filters.status !== undefined && { status: filters.status }),
    ...(filters.referredByPartnerId !== undefined && {
      referredByPartnerId: filters.referredByPartnerId,
    }),
  });

  return {
    ...parsed,
    ...filters,
    partnerTagId: filters.partnerTagId ?? parsed.partnerTagId,
    groupId: filters.groupId ?? parsed.groupId,
    country: filters.country ?? parsed.country,
    status: filters.status ?? parsed.status,
    referredByPartnerId:
      filters.referredByPartnerId ?? parsed.referredByPartnerId,
  } as T & ParsedPartnerFilterOverrides;
}
