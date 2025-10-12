import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { prisma } from "@dub/prisma";
import { ProgramSimilarity } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { z } from "zod";
import { logAndRespond } from "../utils";
import { calculateCategorySimilarity } from "./calculate-category-similarity";
import { calculatePartnerSimilarity } from "./calculate-partner-similarity";
import { calculatePerformanceSimilarity } from "./calculate-performance-similarity";

const schema = z.object({
  startingAfter: z.string().optional(),
});

const PROGRAMS_PER_BATCH = 5; // 10 pairs of programs will be calculated per batch
const SIMILARITY_SCORE_THRESHOLD = 0.05;

// GET /api/cron/calculate-program-similarities - Initial cron request from Vercel
export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    return await computeProgramSimilarity();
  } catch (error) {
    //
  }
}

// POST /api/cron/calculate-program-similarities - Subsequent cron request from QStash
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    const { startingAfter } = schema.parse(JSON.parse(rawBody));

    return await computeProgramSimilarity({
      startingAfter,
    });
  } catch (error) {
    //
  }
}

async function computeProgramSimilarity({
  startingAfter,
}: z.infer<typeof schema> = {}) {
  console.log("calculateProgramSimilarities", { startingAfter });

  const programs = await prisma.program.findMany({
    ...(startingAfter && {
      cursor: {
        id: startingAfter,
      },
    }),
    orderBy: {
      id: "asc",
    },
    take: PROGRAMS_PER_BATCH,
    skip: startingAfter ? 1 : 0,
  });

  if (programs.length === 0) {
    return logAndRespond("No more programs found. Stopping...");
  }

  const results: Pick<
    ProgramSimilarity,
    | "programId"
    | "similarProgramId"
    | "similarityScore"
    | "categorySimilarityScore"
    | "partnerSimilarityScore"
    | "performanceSimilarityScore"
  >[] = [];

  for (let i = 0; i < programs.length; i++) {
    for (let j = i + 1; j < programs.length; j++) {
      const program1 = programs[i];
      const program2 = programs[j];

      console.log(
        "Calculating similarities for program",
        program1.name,
        program2.name,
      );

      const [
        categorySimilarityScore,
        partnerSimilarityScore,
        performanceSimilarityScore,
      ] = await Promise.all([
        calculateCategorySimilarity(program1.id, program2.id),
        calculatePartnerSimilarity(program1.id, program2.id),
        calculatePerformanceSimilarity(program1.id, program2.id),
      ]);

      const similarityScore =
        categorySimilarityScore * 0.5 +
        partnerSimilarityScore * 0.3 +
        performanceSimilarityScore * 0.2;

      console.log(
        "Calculated similarities for program",
        program1.name,
        program2.name,
        {
          categorySimilarityScore,
          partnerSimilarityScore,
          performanceSimilarityScore,
          similarityScore,
        },
      );

      if (similarityScore > SIMILARITY_SCORE_THRESHOLD) {
        results.push({
          programId: program1.id,
          similarProgramId: program2.id,
          similarityScore,
          categorySimilarityScore,
          partnerSimilarityScore,
          performanceSimilarityScore,
        });

        results.push({
          programId: program2.id,
          similarProgramId: program1.id,
          similarityScore,
          categorySimilarityScore,
          partnerSimilarityScore,
          performanceSimilarityScore,
        });
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    const programIds = programs.map((program) => program.id);

    await tx.programSimilarity.deleteMany({
      where: {
        programId: {
          in: programIds,
        },
      },
    });

    await tx.programSimilarity.createMany({
      data: results,
      skipDuplicates: true,
    });
  });

  if (programs.length === PROGRAMS_PER_BATCH) {
    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/calculate-program-similarities`,
      method: "POST",
      body: {
        startingAfter: programs[programs.length - 1].id,
      },
    });
  }

  return logAndRespond("Finished calculating program similarities");
}
