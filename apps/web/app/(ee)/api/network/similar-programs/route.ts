import { getSimilarPrograms } from "@/lib/api/network/program-similarity-calculator";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { NextResponse } from "next/server";

// GET /api/network/similar-programs - get programs similar to the current program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);
    const limit = parseInt(searchParams.get("limit") || "10");

    const similarPrograms = await getSimilarPrograms(programId, limit);

    return NextResponse.json({
      programId,
      similarPrograms: similarPrograms.map((sp) => ({
        id: sp.similarProgram.id,
        name: sp.similarProgram.name,
        slug: sp.similarProgram.slug,
        logo: sp.similarProgram.logo,
        industryInterests: sp.similarProgram.industryInterests.map(
          (ii) => ii.industryInterest,
        ),
        similarityScore: sp.combinedSimilarityScore,
        industryOverlapScore: sp.industryOverlapScore,
        partnerOverlapScore: sp.partnerOverlapScore,
        performancePatternScore: sp.performancePatternScore,
        sharedPartnerCount: sp.sharedPartnerCount,
        sharedIndustryCount: sp.sharedIndustryCount,
      })),
    });
  },
  {
    requiredPlan: ["enterprise"],
  },
);
