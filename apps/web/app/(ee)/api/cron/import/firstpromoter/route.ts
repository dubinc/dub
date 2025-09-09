import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { importCampaigns } from "@/lib/firstpromoter/import-campaigns";
import { importCommissions } from "@/lib/firstpromoter/import-commissions";
import { importCustomers } from "@/lib/firstpromoter/import-customers";
import { importPartners } from "@/lib/firstpromoter/import-partners";
import { firstPromoterImportPayloadSchema } from "@/lib/firstpromoter/schemas";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    const payload = firstPromoterImportPayloadSchema.parse(JSON.parse(rawBody));

    switch (payload.action) {
      case "import-campaigns":
        await importCampaigns(payload);
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
      // default:
      //   throw new Error(`Unknown action: ${payload.action}`);
    }

    return NextResponse.json("OK");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
