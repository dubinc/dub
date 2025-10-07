import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { calculateSimilarityForProgram } from "@/lib/api/network/calculate-program-similarities";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { z } from "zod";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  programId: z.string(),
});

interface RequestParams {
  params: Promise<{ programId: string }>;
}

// POST /api/cron/calculate-program-similarities/[programId]
// Calculate similarities for a specific program against other programs that come after it in the sorted list
export async function POST(req: Request, { params }: RequestParams) {
  try {
    const { programId } = await params;

    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    await calculateSimilarityForProgram(programId);

    return logAndRespond(`Calculated similarities for program ${programId}.`);
  } catch (error) {
    console.error(error);

    return handleAndReturnErrorResponse(error);
  }
}
