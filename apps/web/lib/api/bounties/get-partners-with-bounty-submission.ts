import { BountySubmissionsQueryFilters } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { Prisma } from "@prisma/client";

const sortColumnsMap = {
  createdAt: "bs.createdAt",
  leads: "totalLeads",
  conversions: "totalConversions",
  saleAmount: "totalSaleAmount",
  commissions: "totalCommissions",
};

export async function getPartnersWithBountySubmission({
  page,
  pageSize,
  sortBy,
  sortOrder,
  programId,
  bountyId,
  groupIds,
  status,
}: BountySubmissionsQueryFilters & {
  programId: string;
  bountyId: string;
  groupIds: string[];
}) {
  const rows: any[] = await prisma.$queryRaw`
    SELECT 
      p.*, 
      bs.*,
      pe.partnerId,
      pe.groupId,
      pe.status,
      bs.id as bountySubmissionId,
      bs.status as bountySubmissionStatus,
      bs.createdAt as bountySubmissionCreatedAt,
      bs.updatedAt as bountySubmissionUpdatedAt,
      pe.totalCommissions,
      COALESCE(metrics.totalLeads, 0) as totalLeads,
      COALESCE(metrics.totalConversions, 0) as totalConversions,
      COALESCE(metrics.totalSaleAmount, 0) as totalSaleAmount,
      c.id as commissionId,
      c.amount as commissionAmount,
      c.earnings as commissionEarnings,
      c.status as commissionStatus
    FROM 
      ProgramEnrollment pe 
    INNER JOIN Partner p ON p.id = pe.partnerId
    LEFT JOIN BountySubmission bs ON bs.partnerId = p.id AND bs.bountyId = ${bountyId}
    LEFT JOIN Commission c ON c.id = bs.commissionId
    LEFT JOIN (
      SELECT 
        partnerId,
        SUM(leads) as totalLeads,
        SUM(conversions) as totalConversions,
        SUM(saleAmount) as totalSaleAmount
      FROM Link
      WHERE programId = ${programId} AND partnerId IS NOT NULL
      GROUP BY partnerId
    ) metrics ON metrics.partnerId = pe.partnerId
    WHERE 
      pe.programId = ${programId}
      ${groupIds && groupIds.length > 0 ? Prisma.sql`AND pe.groupId IN (${Prisma.join(groupIds)})` : Prisma.sql``}
      ${status ? (status === "approved" ? Prisma.sql`AND bs.status = ${status}` : Prisma.sql`AND bs.status IS NULL`) : Prisma.sql``}
    GROUP BY 
      p.id, pe.partnerId, pe.groupId, pe.totalCommissions, pe.status, bountySubmissionId, bountySubmissionStatus, bountySubmissionCreatedAt, bountySubmissionUpdatedAt, metrics.totalLeads, metrics.totalConversions, metrics.totalSaleAmount
    ORDER BY ${Prisma.raw(sortColumnsMap[sortBy])} ${Prisma.raw(sortOrder)}
    LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;

  return rows.map((row) => {
    const partner = {
      ...row,
      id: row.partnerId,
      leads: Number(row.totalLeads),
      conversions: Number(row.totalConversions),
      saleAmount: Number(row.totalSaleAmount),
      totalCommissions: Number(row.totalCommissions),
    };

    const submission = {
      id: row.bountySubmissionId,
      description: row.description,
      urls: row.urls,
      files: row.files,
      status: row.bountySubmissionStatus,
      createdAt: row.bountySubmissionCreatedAt,
      updatedAt: row.bountySubmissionUpdatedAt,
      reviewedAt: row.reviewedAt,
      rejectionReason: row.rejectionReason,
      rejectionNote: row.rejectionNote,
    };

    const commission = {
      id: row.commissionId,
      amount: row.commissionAmount,
      earnings: row.commissionEarnings,
      status: row.commissionStatus,
    };

    return {
      partner,
      submission: submission.id ? submission : null,
      commission: commission.id ? commission : null,
      user: null,
    };
  });
}
