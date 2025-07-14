import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { importAffiliates } from "@/lib/partnerstack/import-affiliates";
import { importCustomers } from "@/lib/partnerstack/import-customers";
import { importLinks } from "@/lib/partnerstack/import-links";
import { partnerStackImportPayloadSchema } from "@/lib/partnerstack/schemas";
import { importCommissions } from "@/lib/tolt/import-commissions";
import { updateStripeCustomers } from "@/lib/tolt/update-stripe-customers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    const payload = partnerStackImportPayloadSchema.parse(JSON.parse(rawBody));

    switch (payload.action) {
      case "import-affiliates":
        await importAffiliates(payload);
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
    }

    return NextResponse.json("OK");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
