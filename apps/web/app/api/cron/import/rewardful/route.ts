import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { importAffiliates } from "@/lib/rewardful/import-affiliates";
import { importCampaign } from "@/lib/rewardful/import-campaign";
import { importCommissions } from "@/lib/rewardful/import-commissions";
import { importReferrals } from "@/lib/rewardful/import-referrals";
import { importSteps } from "@/lib/rewardful/importer";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  programId: z.string(),
  rewardId: z.string().optional(),
  action: importSteps,
  page: z.number().optional().default(1),
});

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { programId, rewardId, action, page } = schema.parse(
      JSON.parse(rawBody),
    );

    switch (action) {
      case "import-campaign":
        await importCampaign({
          programId,
        });
        break;
      case "import-affiliates":
        await importAffiliates({
          programId,
          rewardId,
          page,
        });
        break;
      case "import-referrals":
        await importReferrals({
          programId,
          page,
        });
        break;
      case "import-commissions":
        await importCommissions({
          programId,
          page,
        });
        break;
    }

    return NextResponse.json("OK");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
