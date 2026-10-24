import { NETWORK_PROGRAM_ID } from "@dub/utils";
import { CommissionStatus, CommissionType, Prisma } from "@prisma/client";
import { getEarningsProgramFilter } from "./get-earnings-program-id";

// the commissions that the partner earnings routes read: one partner, a date range and the page filters
type PartnerEarningsFilters = {
  partnerId: string;
  programId?: string; // if not provided, all programs except the network program
  startDate: Date;
  endDate: Date;
  type?: CommissionType;
  status?: CommissionStatus;
  linkId?: string;
  customerId?: string;
  payoutId?: string;
};

export function getPartnerEarningsWhere({
  partnerId,
  programId,
  startDate,
  endDate,
  type,
  status,
  linkId,
  customerId,
  payoutId,
}: PartnerEarningsFilters): Prisma.CommissionWhereInput {
  return {
    earnings: {
      not: 0,
    },
    programId: getEarningsProgramFilter(programId),
    partnerId,
    ...(type && { type }),
    ...(status && { status }),
    ...(linkId && { linkId }),
    ...(customerId && { customerId }),
    ...(payoutId && { payoutId }),
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };
}

// the same conditions for a raw query on Commission, with an optional table alias
export function getPartnerEarningsSqlWhere(
  {
    partnerId,
    programId,
    startDate,
    endDate,
    type,
    status,
    linkId,
    customerId,
    payoutId,
  }: PartnerEarningsFilters,
  alias?: "c",
) {
  const column = (name: string) =>
    Prisma.raw(alias ? `${alias}.${name}` : name);

  return Prisma.join(
    [
      Prisma.sql`${column("earnings")} != 0`,
      programId
        ? Prisma.sql`${column("programId")} = ${programId}`
        : Prisma.sql`${column("programId")} != ${NETWORK_PROGRAM_ID}`,
      Prisma.sql`${column("partnerId")} = ${partnerId}`,
      Prisma.sql`${column("createdAt")} >= ${startDate}`,
      Prisma.sql`${column("createdAt")} <= ${endDate}`,
      ...(type ? [Prisma.sql`${column("type")} = ${type}`] : []),
      ...(status ? [Prisma.sql`${column("status")} = ${status}`] : []),
      ...(linkId ? [Prisma.sql`${column("linkId")} = ${linkId}`] : []),
      ...(customerId
        ? [Prisma.sql`${column("customerId")} = ${customerId}`]
        : []),
      ...(payoutId ? [Prisma.sql`${column("payoutId")} = ${payoutId}`] : []),
    ],
    " AND ",
  );
}
