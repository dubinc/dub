import { prisma } from "@dub/prisma";

interface PartnerSimilarityResult {
  sharedPartnersCount: number;
  program1PartnersCount: number;
  program2PartnersCount: number;
}

// Calculate partner similarity using Jaccard similarity
export async function calculatePartnerSimilarity(
  program1Id: string,
  program2Id: string,
): Promise<number> {
  const [result] = await prisma.$queryRaw<PartnerSimilarityResult[]>`
    SELECT 
      COUNT(DISTINCT CASE WHEN e1.partnerId IS NOT NULL AND e2.partnerId IS NOT NULL THEN e1.partnerId END) AS sharedPartnersCount,
      (SELECT COUNT(*) FROM ProgramEnrollment WHERE programId = ${program1Id}) AS program1PartnersCount,
      (SELECT COUNT(*) FROM ProgramEnrollment WHERE programId = ${program2Id}) AS program2PartnersCount
    FROM
      ProgramEnrollment e1
    JOIN
      ProgramEnrollment e2 ON e1.partnerId = e2.partnerId
    WHERE
      e1.programId = ${program1Id} AND e2.programId = ${program2Id}
  `;

  const partnerSimilarityScore =
    result.sharedPartnersCount > 0
      ? result.sharedPartnersCount /
        Math.max(result.program1PartnersCount, result.program2PartnersCount)
      : 0;

  return partnerSimilarityScore;
}
