import { DubApiError } from "@/lib/api/errors";
import { getEffectivePayoutMode } from "@/lib/api/payouts/get-effective-payout-mode";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { prisma } from "@/lib/prisma";
import { payoutsQuerySchema } from "@/lib/zod/schemas/payouts";
import { parseFilterValue } from "@dub/utils";
import { FraudEventStatus, PayoutStatus, Prisma } from "@prisma/client";
import * as z from "zod/v4";

export type PayoutsQueryFilters = z.infer<typeof payoutsQuerySchema>;

export type ParsedPayoutsFilters = PayoutsQueryFilters & {
  isHoldStatus: boolean;
};

function pickPayoutQueryParams(
  searchParams: Record<string, string | undefined>,
) {
  const {
    status,
    partnerId,
    tenantId,
    invoiceId,
    groupId,
    sortBy,
    sortOrder,
    page,
    pageSize,
  } = searchParams;

  return {
    status,
    partnerId,
    tenantId,
    invoiceId,
    groupId,
    sortBy,
    sortOrder,
    page,
    pageSize,
  };
}

export function parsePayoutsQuery(
  searchParams: Record<string, string | undefined>,
): ParsedPayoutsFilters {
  const isHoldStatus = searchParams.status === "hold";
  const queryParams = pickPayoutQueryParams(searchParams);
  const { status: _status, ...restQueryParams } = queryParams;

  let filters = payoutsQuerySchema.parse(
    isHoldStatus ? restQueryParams : queryParams,
  );

  if (isHoldStatus) {
    filters = {
      ...filters,
      status: PayoutStatus.pending,
    };
  }

  return {
    ...filters,
    isHoldStatus,
  };
}

export function buildProgramEnrollmentFilter({
  groupId,
  isHoldStatus,
}: {
  groupId?: string;
  isHoldStatus?: boolean;
}): Prisma.ProgramEnrollmentWhereInput | undefined {
  const groupFilter = groupId ? parseFilterValue(groupId) : null;

  if (!groupFilter && !isHoldStatus) {
    return undefined;
  }

  return {
    ...(groupFilter && {
      groupId:
        groupFilter.sqlOperator === "NOT IN"
          ? { notIn: groupFilter.values }
          : { in: groupFilter.values },
    }),
    ...(isHoldStatus && {
      fraudEventGroups: {
        some: {
          status: FraudEventStatus.pending,
        },
      },
    }),
  };
}

export function buildPayoutWhere({
  programId,
  filters,
}: {
  programId: string;
  filters: Pick<
    ParsedPayoutsFilters,
    "status" | "partnerId" | "invoiceId" | "groupId" | "isHoldStatus"
  >;
}): Prisma.PayoutWhereInput {
  const { status, partnerId, invoiceId, groupId, isHoldStatus } = filters;
  const programEnrollment = buildProgramEnrollmentFilter({
    groupId,
    isHoldStatus,
  });

  return {
    programId,
    ...(status && { status }),
    ...(partnerId && { partnerId }),
    ...(invoiceId && { invoiceId }),
    ...(programEnrollment && { programEnrollment }),
  };
}

async function resolvePartnerId({
  programId,
  partnerId,
  tenantId,
}: {
  programId: string;
  partnerId?: string;
  tenantId?: string;
}) {
  if (!tenantId || partnerId) {
    return partnerId;
  }

  const programEnrollment = await prisma.programEnrollment.findUnique({
    where: {
      tenantId_programId: {
        tenantId,
        programId,
      },
    },
    select: {
      partnerId: true,
    },
  });

  if (!programEnrollment) {
    throw new DubApiError({
      code: "not_found",
      message: `Partner with specified tenantId ${tenantId} not found.`,
    });
  }

  return programEnrollment.partnerId;
}

export async function getPayouts({
  workspaceId,
  programId,
  filters,
  page,
  pageSize,
}: {
  workspaceId: string;
  programId: string;
  filters: ParsedPayoutsFilters;
  page: number;
  pageSize: number;
}) {
  const { sortBy, sortOrder, isHoldStatus, tenantId, ...rest } = filters;

  const partnerId = await resolvePartnerId({
    programId,
    partnerId: rest.partnerId,
    tenantId,
  });

  const program = await getProgramOrThrow({
    workspaceId,
    programId,
  });

  const payouts = await prisma.payout.findMany({
    where: buildPayoutWhere({
      programId,
      filters: {
        status: rest.status,
        partnerId,
        invoiceId: rest.invoiceId,
        groupId: rest.groupId,
        isHoldStatus,
      },
    }),
    include: {
      programEnrollment: true,
      partner: true,
      user: true,
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: {
      [sortBy]: sortOrder,
    },
  });

  return payouts.map(({ partner, programEnrollment, user, ...payout }) => {
    const mode =
      payout.mode ??
      getEffectivePayoutMode({
        payoutMode: program.payoutMode,
        payoutsEnabledAt: partner.payoutsEnabledAt,
      });

    return {
      ...payout,
      mode,
      traceId: payout.stripePayoutTraceId,
      partner: {
        ...partner,
        tenantId: programEnrollment.tenantId,
        groupId: programEnrollment.groupId,
      },
      user,
    };
  });
}

export async function getPayoutsCount({
  programId,
  filters,
}: {
  programId: string;
  filters: ParsedPayoutsFilters;
}) {
  const { isHoldStatus, tenantId, ...rest } = filters;

  const partnerId = await resolvePartnerId({
    programId,
    partnerId: rest.partnerId,
    tenantId,
  });

  return prisma.payout.count({
    where: buildPayoutWhere({
      programId,
      filters: {
        status: rest.status,
        partnerId,
        invoiceId: rest.invoiceId,
        groupId: rest.groupId,
        isHoldStatus,
      },
    }),
  });
}
