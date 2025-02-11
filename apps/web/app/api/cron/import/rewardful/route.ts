import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import {
  importAffiliates,
  importReferrals,
  ImportSteps,
} from "@/lib/rewardful/importer";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  programId: z.string(),
  action: ImportSteps.default("import-affiliates"),
  page: z.number().optional().default(1),
});

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { programId, action, page } = schema.parse(JSON.parse(rawBody));

    if (action === "import-affiliates") {
      await importAffiliates({
        programId,
        page,
      });
    } else if (action === "import-referrals") {
      await importReferrals({
        programId,
        page,
      });
    }

    return NextResponse.json({
      programId,
    });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
