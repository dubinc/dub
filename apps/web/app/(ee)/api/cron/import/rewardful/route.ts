import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { importCampaign } from "@/lib/rewardful/import-campaign";
import { importCommissions } from "@/lib/rewardful/import-commissions";
import { importCustomers } from "@/lib/rewardful/import-customers";
import { importPartners } from "@/lib/rewardful/import-partners";
import { rewardfulImportPayloadSchema } from "@/lib/rewardful/schemas";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const payload = rewardfulImportPayloadSchema.parse(JSON.parse(rawBody));

    switch (payload.action) {
      case "import-campaign":
        await importCampaign(payload);
        break;
      case "import-partners":
        await importPartners(payload);
        break;
      case "import-customers":
        await importCustomers(payload);
        break;
      case "import-commissions":
        await importCommissions(payload);
        break;
    }

    return NextResponse.json("OK");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
