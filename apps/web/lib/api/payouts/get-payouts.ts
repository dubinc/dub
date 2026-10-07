import { DubApiError } from "@/lib/api/errors";
import { getEffectivePayoutMode } from "@/lib/api/payouts/get-effective-payout-mode";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { prisma } from "@/lib/prisma";
import { PayoutsCountQueryFilters, PayoutsQueryFilters } from "@/lib/types";
import { parseFilterValue } from "@dub/utils";
import { Prisma } from "@prisma/client";

export function buildProgramEnrollmentFilter({
  groupId,
}: {
  groupId?: string;
}): Prisma.ProgramEnrollmentWhereInput | undefined {
  const groupFilter = groupId ? parseFilterValue(groupId) : null;

  if (!groupFilter) {
    return undefined;
  }

  return {
    groupId:
      groupFilter.sqlOperator === "NOT IN"
        ? { notIn: groupFilter.values }
        : { in: groupFilter.values },
  };
}

function buildPayoutWhere({
  programId,
  filters,
}: {
  programId: string;
  filters: Pick<
    PayoutsQueryFilters,
    "status" | "partnerId" | "invoiceId" | "groupId"
  >;
}): Prisma.PayoutWhereInput {
  const { status, partnerId, invoiceId, groupId } = filters;

  const programEnrollment = buildProgramEnrollmentFilter({
    groupId,
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
}: {
  workspaceId: string;
  programId: string;
  filters: PayoutsQueryFilters;
}) {
  let {
    groupId,
    invoiceId,
    partnerId,
    tenantId,
    status,
    sortBy,
    sortOrder,
    page = 1,
    pageSize,
  } = filters;

  partnerId = await resolvePartnerId({
    programId,
    partnerId,
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
        status,
        partnerId,
        invoiceId,
        groupId,
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
  filters: PayoutsCountQueryFilters;
}) {
  let { tenantId, partnerId, invoiceId, groupId, status } = filters;

  partnerId = await resolvePartnerId({
    programId,
    partnerId,
    tenantId,
  });

  return prisma.payout.count({
    where: buildPayoutWhere({
      programId,
      filters: {
        status,
        partnerId,
        invoiceId,
        groupId,
      },
    }),
  });
}
