import {
  groupedFraudEventSchema,
  groupedFraudEventsQuerySchema,
} from "@/lib/zod/schemas/fraud";
import { prisma } from "@dub/prisma";
import { FraudEventStatus, FraudRuleType, Prisma } from "@dub/prisma/client";
import { z } from "zod";

type FraudEventFilters = z.infer<typeof groupedFraudEventsQuerySchema> & {
  programId: string;
};

interface QueryResult {
  id: string;
  type: FraudRuleType;
  status: FraudEventStatus;
  resolutionReason: string | null;
  resolvedAt: Date | null;
  metadata: unknown;
  groupKey: string;
  lastOccurrenceAt: Date;
  eventCount: bigint | number;
  partnerId: string | null;
  partnerName: string | null;
  partnerEmail: string | null;
  partnerImage: string | null;
  userId: string | null;
  userName: string | null;
  userImage: string | null;
}

// Get the fraud events for a program grouped by groupKey
export async function getGroupedFraudEvents({
  programId,
  partnerId,
  customerId,
  groupKey,
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
      customerId && Prisma.sql`FraudEvent.customerId = ${customerId}`,
      groupKey && Prisma.sql`FraudEvent.groupKey = ${groupKey}`,
    ].filter(Boolean),
    " AND ",
  );

  // Build ORDER BY clause
  const orderByField =
    sortBy === "type"
      ? Prisma.raw("fe.type")
      : Prisma.raw("dfe.lastOccurrenceAt");
  const orderByClause = Prisma.sql`ORDER BY ${orderByField} ${Prisma.raw(sortOrder.toUpperCase())}`;

  const events = await prisma.$queryRaw<QueryResult[]>`
    SELECT 
      fe.id,
      fe.type,
      fe.status,
      fe.resolutionReason,
      fe.resolvedAt,
      fe.metadata,
      fe.groupKey,
      fe.commissionId,
      fe.partnerId,
      fe.userId,
      dfe.lastOccurrenceAt,
      dfe.eventCount,
      p.name AS partnerName,
      p.email AS partnerEmail,
      p.image AS partnerImage,
      u.name AS userName,
      u.image AS userImage
    FROM (
      SELECT 
        FraudEvent.groupKey,
        MAX(FraudEvent.id) AS latestEventId,
        MAX(FraudEvent.createdAt) AS lastOccurrenceAt,
        COUNT(*) AS eventCount
      FROM FraudEvent
      WHERE ${subqueryWhereClause}
      GROUP BY FraudEvent.groupKey
    ) dfe
    JOIN FraudEvent fe
      ON fe.id = dfe.latestEventId
    LEFT JOIN Partner p
      ON p.id = fe.partnerId
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
    lastOccurrenceAt: new Date(event.lastOccurrenceAt),
    count: Number(event.eventCount),
    groupKey: event.groupKey,
    partner: event.partnerId
      ? {
          id: event.partnerId,
          name: event.partnerName,
          email: event.partnerEmail,
          image: event.partnerImage,
        }
      : null,
    user: event.userId
      ? {
          id: event.userId,
          name: event.userName,
          image: event.userImage,
        }
      : null,
  }));

  return z.array(groupedFraudEventSchema).parse(groupedEvents);
}
