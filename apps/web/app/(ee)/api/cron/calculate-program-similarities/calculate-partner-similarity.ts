import { prisma } from "@dub/prisma";

interface PartnerSimilarityResult {
  sharedPartnersCount: bigint;
  program1PartnersCount: bigint;
  program2PartnersCount: bigint;
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

  const { sharedPartnersCount, program1PartnersCount, program2PartnersCount } =
    result ?? {
      sharedPartnersCount: BigInt(0),
      program1PartnersCount: BigInt(0),
      program2PartnersCount: BigInt(0),
    };

  const unionCount =
    Number(program1PartnersCount) +
    Number(program2PartnersCount) -
    Number(sharedPartnersCount);

  if (unionCount === 0) {
    return 0;
  }

  return Number(sharedPartnersCount) / unionCount;
}
