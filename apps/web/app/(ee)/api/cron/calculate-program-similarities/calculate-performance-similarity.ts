import { prisma } from "@dub/prisma";

const METRIC_KEYS = [
  "totalClicks",
  "totalLeads",
  "totalConversions",
  "totalSales",
  "totalSaleAmount",
] as const;

// Calculate performance similarity using Cosine similarity
export async function calculatePerformanceSimilarity(
  program1Id: string,
  program2Id: string,
): Promise<number> {
  const [performance1, performance2] = await Promise.all([
    prisma.programEnrollment.aggregate({
      where: {
        programId: program1Id,
      },
      _avg: {
        totalClicks: true,
        totalLeads: true,
        totalSales: true,
        totalConversions: true,
        totalSaleAmount: true,
      },
    }),

    prisma.programEnrollment.aggregate({
      where: {
        programId: program2Id,
      },
      _avg: {
        totalClicks: true,
        totalLeads: true,
        totalSales: true,
        totalConversions: true,
        totalSaleAmount: true,
      },
    }),
  ]);

  const program1Vector = METRIC_KEYS.map((key) => performance1._avg[key] ?? 0);
  const program2Vector = METRIC_KEYS.map((key) => performance2._avg[key] ?? 0);

  const dotProduct = program1Vector.reduce(
    (sum, val, i) => sum + val * program2Vector[i],
    0,
  );

  const magnitude1 = Math.sqrt(
    program1Vector.reduce((sum, val) => sum + val ** 2, 0),
  );

  const magnitude2 = Math.sqrt(
    program2Vector.reduce((sum, val) => sum + val ** 2, 0),
  );

  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }

  return dotProduct / (magnitude1 * magnitude2);
}
