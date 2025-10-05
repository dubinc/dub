import {
  CampaignListSchema,
  getCampaignsQuerySchema,
} from "@/lib/zod/schemas/campaigns";
import { prisma } from "@dub/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

interface QueryResult {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  delivered: number;
  bounced: number;
  opened: number;
}

interface GetCampaignsParams extends z.infer<typeof getCampaignsQuerySchema> {
  programId: string;
}

const SORT_COLUMNS_MAP = {
  createdAt: "c.createdAt",
  updatedAt: "c.updatedAt",
  status: "c.status",
  delivered: "delivered",
  bounced: "bounced",
  opened: "opened",
} as const;

export const getCampaigns = async ({
  programId,
  sortBy,
  sortOrder,
  status,
  search,
  type,
  page,
  pageSize,
}: GetCampaignsParams) => {
  // Aggregate metrics for each campaign
  const metricsSubquery = Prisma.sql`
    SELECT 
      campaignId,
      SUM(CASE WHEN deliveredAt IS NOT NULL THEN 1 ELSE 0 END) AS delivered,
      SUM(CASE WHEN openedAt IS NOT NULL THEN 1 ELSE 0 END) AS opened,
      SUM(CASE WHEN bouncedAt IS NOT NULL THEN 1 ELSE 0 END) AS bounced
    FROM NotificationEmail
    WHERE 
      programId = ${programId}
      AND campaignId IS NOT NULL
    GROUP BY campaignId
  `;

  const results = await prisma.$queryRaw<QueryResult[]>`
    SELECT
      c.id,
      c.name,
      c.type,
      c.status,
      c.createdAt,
      c.updatedAt,
      COALESCE(metrics.delivered, 0) AS delivered,
      COALESCE(metrics.opened, 0) AS opened,
      COALESCE(metrics.bounced, 0) AS bounced
    FROM Campaign c
    LEFT JOIN (${metricsSubquery}) metrics ON c.id = metrics.campaignId
    WHERE
      c.programId = ${programId}
      ${status ? Prisma.sql`AND c.status = ${status}` : Prisma.sql``}
      ${type ? Prisma.sql`AND c.type = ${type}` : Prisma.sql``}
      ${search ? Prisma.sql`AND LOWER(c.name) LIKE LOWER(${`%${search}%`})` : Prisma.sql``}
    ORDER BY ${Prisma.raw(SORT_COLUMNS_MAP[sortBy])} ${Prisma.raw(sortOrder)}
    LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
  `;

  const campaigns = results.map((result) => ({
    id: result.id,
    name: result.name,
    type: result.type,
    status: result.status,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
    partners: 0, // TODO: Fix it
    delivered: Number(result.delivered),
    bounced: Number(result.bounced),
    opened: Number(result.opened),
  }));

  return z.array(CampaignListSchema).parse(campaigns);
};
