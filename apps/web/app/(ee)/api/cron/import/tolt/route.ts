import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { cleanupPartners } from "@/lib/tolt/cleanup-partners";
import { importCommissions } from "@/lib/tolt/import-commissions";
import { importCustomers } from "@/lib/tolt/import-customers";
import { importLinks } from "@/lib/tolt/import-links";
import { importPartners } from "@/lib/tolt/import-partners";
import { importSteps } from "@/lib/tolt/importer";
import { updateStripeCustomers } from "@/lib/tolt/update-stripe-customers";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  action: importSteps,
  programId: z.string(),
  startingAfter: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    const { action, ...payload } = schema.parse(JSON.parse(rawBody));

    switch (action) {
      case "import-partners":
        await importPartners(payload);
        break;
      case "import-links":
        await importLinks(payload);
        break;
      case "import-customers":
        await importCustomers(payload);
        break;
      case "import-commissions":
        await importCommissions(payload);
        break;
      case "update-stripe-customers":
        await updateStripeCustomers(payload);
        break;
      case "cleanup-partners":
        await cleanupPartners(payload);
        break;
    }

    return NextResponse.json("OK");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
