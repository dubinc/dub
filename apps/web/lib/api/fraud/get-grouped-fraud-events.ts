import {
  fraudEventSchema,
  fraudEventsQuerySchema,
} from "@/lib/zod/schemas/fraud";
import { prisma } from "@dub/prisma";
import { FraudEventStatus, FraudRuleType, Prisma } from "@dub/prisma/client";
import { z } from "zod";

type FraudEventFilters = z.infer<typeof fraudEventsQuerySchema> & {
  programId: string;
};

interface QueryResult {
  id: string;
  type: FraudRuleType;
  status: FraudEventStatus;
  resolutionReason: string | null;
  resolvedAt: Date | null;
  metadata: unknown;
  lastOccurenceAt: Date;
  eventCount: bigint | number;
  totalCommissions: bigint | number | null;
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
export async function getGroupedFraudEvents({
  programId,
  partnerId,
  status,
  type,
  page,
  pageSize,
  sortBy,
  sortOrder,
}: FraudEventFilters) {
  // Build WHERE clause for subquery
  const subqueryWhereClause = Prisma.join(
    [
      Prisma.sql`FraudEvent.programId = ${programId}`,
      status && Prisma.sql`FraudEvent.status = ${status}`,
      type && Prisma.sql`FraudEvent.type = ${type}`,
      partnerId && Prisma.sql`FraudEvent.partnerId = ${partnerId}`,
    ].filter(Boolean),
    " AND ",
  );

  // Build ORDER BY clause
  const orderByField =
    sortBy === "type"
      ? Prisma.raw("fe.type")
      : Prisma.raw("dfe.lastOccurenceAt");
  const orderByClause = Prisma.sql`ORDER BY ${orderByField} ${Prisma.raw(sortOrder.toUpperCase())}`;

  const events = await prisma.$queryRaw<QueryResult[]>`
    SELECT 
      fe.id,
      fe.type,
      fe.status,
      fe.resolutionReason,
      fe.resolvedAt,
      fe.metadata,
      fe.commissionId,
      fe.partnerId,
      fe.customerId,
      fe.userId,
      dfe.lastOccurenceAt,
      dfe.eventCount,
      dfe.totalCommissions,
      p.name AS partnerName,
      p.email AS partnerEmail,
      p.image AS partnerImage,
      c.email AS customerEmail,
      c.name AS customerName,
      u.name AS userName,
      u.image AS userImage
    FROM (
      SELECT 
        FraudEvent.programId, 
        FraudEvent.partnerId, 
        FraudEvent.type, 
        MAX(FraudEvent.id) AS latestEventId,
        MAX(FraudEvent.createdAt) AS lastOccurenceAt,
        COUNT(*) AS eventCount,
        COALESCE(SUM(comm.earnings), 0) AS totalCommissions
      FROM FraudEvent
      LEFT JOIN Commission comm ON comm.id = FraudEvent.commissionId
      WHERE ${subqueryWhereClause}
      GROUP BY FraudEvent.programId, FraudEvent.partnerId, FraudEvent.type
    ) dfe
    JOIN FraudEvent fe
      ON fe.id = dfe.latestEventId
    LEFT JOIN Partner p
      ON p.id = fe.partnerId
    LEFT JOIN Customer c
      ON c.id = fe.customerId
    LEFT JOIN User u
      ON u.id = fe.userId
    ${orderByClause}
    LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
  `;

  const groupedEvents = events.map((event) => ({
    id: event.id,
    type: event.type,
    status: event.status,
    resolutionReason: event.resolutionReason,
    resolvedAt: event.resolvedAt ? new Date(event.resolvedAt) : null,
    lastOccurenceAt: new Date(event.lastOccurenceAt),
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
    commission: {
      earnings: Number(event.totalCommissions || 0),
    },
    user: event.userId
      ? {
          id: event.userId,
          name: event.userName,
          image: event.userImage,
        }
      : null,
  }));

  return z.array(fraudEventSchema).parse(groupedEvents);
}
