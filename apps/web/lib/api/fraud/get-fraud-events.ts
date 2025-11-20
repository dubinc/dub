import { fraudEventsQuerySchema } from "@/lib/zod/schemas/fraud";
import { prisma } from "@dub/prisma";
import { FraudEventStatus, FraudRuleType, Prisma } from "@dub/prisma/client";
import { z } from "zod";

type FraudEventFilters = z.infer<typeof fraudEventsQuerySchema> & {
  programId: string;
};

interface QueryResult {
  id: string;
  programId: string;
  type: FraudRuleType;
  status: FraudEventStatus;
  resolutionReason: string | null;
  resolvedAt: Date | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  eventCount: bigint | number;
  partnerId: string | null;
  partnerName: string | null;
  partnerEmail: string | null;
  partnerImage: string | null;
  customerId: string | null;
  customerEmail: string | null;
  customerName: string | null;
  userId: string | null;
  userName: string | null;
  userImage: string | null;
}

// Get the fraud events for a program grouped by rule type
export async function getFraudEvents({
  programId,
  partnerId,
  status,
  type,
  page,
  pageSize,
  sortBy,
  sortOrder,
}: FraudEventFilters) {
  // Build WHERE clause
  const whereClause = Prisma.join(
    [
      Prisma.sql`dfe.programId = ${programId}`,
      status && Prisma.sql`fe.status = ${status}`,
      type && Prisma.sql`dfe.type = ${type}`,
      partnerId && Prisma.sql`dfe.partnerId = ${partnerId}`,
    ].filter(Boolean) as Prisma.Sql[],
    " AND ",
  );

  // Build ORDER BY clause
  const orderByField =
    sortBy === "type" ? Prisma.raw("fe.type") : Prisma.raw("fe.createdAt");
  const orderByClause = Prisma.sql`ORDER BY ${orderByField} ${Prisma.raw(sortOrder.toUpperCase())}`;

  const events = await prisma.$queryRaw<QueryResult[]>`
    SELECT 
      fe.id,
      fe.programId,
      fe.type,
      fe.status,
      fe.resolutionReason,
      fe.resolvedAt,
      fe.metadata,
      fe.createdAt,
      fe.updatedAt,
      dfe.eventCount,
      p.id AS partnerId,
      p.name AS partnerName,
      p.email AS partnerEmail,
      p.image AS partnerImage,
      c.id AS customerId,
      c.email AS customerEmail,
      c.name AS customerName,
      u.id AS userId,
      u.name AS userName,
      u.image AS userImage
    FROM (
      SELECT programId, partnerId, type, MAX(createdAt) AS latestCreatedAt, COUNT(*) AS eventCount
      FROM FraudEvent
      WHERE programId = ${programId}
      GROUP BY programId, partnerId, type
    ) dfe
    JOIN FraudEvent fe
      ON fe.programId = dfe.programId
      AND fe.partnerId = dfe.partnerId
      AND fe.type = dfe.type
      AND fe.createdAt = dfe.latestCreatedAt
    LEFT JOIN Partner p
      ON p.id = fe.partnerId
    LEFT JOIN Customer c
      ON c.id = fe.customerId
    LEFT JOIN User u
      ON u.id = fe.userId
    WHERE
      ${whereClause}
      ${orderByClause}
    LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
  `;

  return events.map((event) => ({
    id: event.id,
    type: event.type,
    status: event.status,
    resolutionReason: event.resolutionReason,
    resolvedAt: event.resolvedAt ? new Date(event.resolvedAt) : null,
    createdAt: new Date(event.createdAt),
    updatedAt: new Date(event.updatedAt),
    count: Number(event.eventCount),
    partner: event.partnerId
      ? {
          id: event.partnerId,
          name: event.partnerName,
          email: event.partnerEmail,
          image: event.partnerImage,
        }
      : null,
    customer: event.customerId
      ? {
          id: event.customerId,
          name: event.customerName,
          email: event.customerEmail,
        }
      : null,
    commission: null,
    user: event.userId
      ? {
          id: event.userId,
          name: event.userName,
          image: event.userImage,
        }
      : null,
  }));
}
