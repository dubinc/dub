import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { PROGRAM_SIMILARITY_SCORE_THRESHOLD } from "@/lib/constants/program";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@dub/prisma";
import { ProgramSimilarity } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { z } from "zod";
import { logAndRespond } from "../../utils";
import { calculateCategorySimilarity } from "./calculate-category-similarity";
import { calculatePartnerSimilarity } from "./calculate-partner-similarity";
import { calculatePerformanceSimilarity } from "./calculate-performance-similarity";

const payloadSchema = z.object({
  currentProgramId: z
    .string()
    .optional()
    .describe("Current program being compared."),
  comparisonBatchCursor: z
    .string()
    .optional()
    .describe("Cursor for programs to compare against."),
});

const PROGRAMS_PER_BATCH = 10;

// This route is used to calculate program similarities in the network
// Runs once every 12 hours (0 */12 * * *)
// POST /api/cron/network/calculate-program-similarities
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    const { currentProgramId, comparisonBatchCursor } = payloadSchema.parse(
      JSON.parse(rawBody),
    );

    return await calculateProgramSimilarity({
      currentProgramId,
      comparisonBatchCursor,
    });
  } catch (err) {
    return handleAndReturnErrorResponse(err);
  }
}

async function calculateProgramSimilarity({
  currentProgramId,
  comparisonBatchCursor,
}: z.infer<typeof payloadSchema>) {
  const currentProgram = await findNextProgram({
    programId: currentProgramId,
  });

  if (!currentProgram) {
    return logAndRespond("No current program found. Skipping...");
  }

  const programs = await prisma.program.findMany({
    where: {
      id: {
        gt: currentProgram.id,
      },
      OR: [
        {
          addedToMarketplaceAt: {
            not: null,
          },
        },
        {
          partnerNetworkEnabledAt: {
            not: null,
          },
        },
      ],
    },
    ...(comparisonBatchCursor && {
      cursor: {
        id: comparisonBatchCursor,
      },
    }),
    skip: comparisonBatchCursor ? 1 : 0,
    orderBy: {
      id: "asc",
    },
    take: PROGRAMS_PER_BATCH,
    select: {
      id: true,
      name: true,
    },
  });

  console.log(
    `Found ${programs.length} programs to compare against ${currentProgram.name}`,
  );

  if (programs.length > 0) {
    const results: Pick<
      ProgramSimilarity,
      | "programId"
      | "similarProgramId"
      | "similarityScore"
      | "categorySimilarityScore"
      | "partnerSimilarityScore"
      | "performanceSimilarityScore"
    >[] = [];

    for (const program of programs) {
      const program1 = currentProgram;
      const program2 = program;

      if (program1.id === program2.id) {
        continue;
      }

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
        `Calculated similarities between ${program1.name} <> ${program2.name}`,
        {
          categorySimilarityScore,
          partnerSimilarityScore,
          performanceSimilarityScore,
          similarityScore,
        },
      );

      if (similarityScore > PROGRAM_SIMILARITY_SCORE_THRESHOLD) {
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
  }

  // If we have more programs to compare against the current program, continue with the next batch
  // Otherwise, move to the next current program and start comparing from the beginning
  if (programs.length === PROGRAMS_PER_BATCH) {
    currentProgramId = currentProgram.id;
    comparisonBatchCursor = programs[programs.length - 1].id;
  } else {
    const program = await findNextProgram({
      afterProgramId: currentProgramId,
    });

    if (!program) {
      return logAndRespond("No more programs to compare.");
    }

    currentProgramId = program.id;
    comparisonBatchCursor = undefined;
  }

  await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/calculate-program-similarities`,
    method: "POST",
    body: {
      currentProgramId,
      comparisonBatchCursor,
    },
  });

  return logAndRespond("Scheduled next batch calculation.");
}

async function findNextProgram({
  programId,
  afterProgramId,
}: {
  programId?: string;
  afterProgramId?: string;
}) {
  // If a specific programId is provided, find that program
  if (programId) {
    return await prisma.program.findUnique({
      where: {
        id: programId,
      },
      select: {
        id: true,
        name: true,
      },
    });
  }

  // Otherwise, find the first/next program
  return await prisma.program.findFirst({
    where: {
      ...(afterProgramId && {
        id: {
          gt: afterProgramId,
        },
      }),
      OR: [
        {
          addedToMarketplaceAt: {
            not: null,
          },
        },
        {
          partnerNetworkEnabledAt: {
            not: null,
          },
        },
      ],
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      id: "asc",
    },
  });
}
