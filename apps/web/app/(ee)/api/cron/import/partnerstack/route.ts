import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { importCommissions } from "@/lib/partnerstack/import-commissions";
import { importCustomers } from "@/lib/partnerstack/import-customers";
import { importGroups } from "@/lib/partnerstack/import-groups";
import { importLinks } from "@/lib/partnerstack/import-links";
import { importPartners } from "@/lib/partnerstack/import-partners";
import { partnerStackImportPayloadSchema } from "@/lib/partnerstack/schemas";
import { updateStripeCustomers } from "@/lib/partnerstack/update-stripe-customers";
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
      case "import-groups":
        await importGroups(payload);
        break;
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
      default:
        throw new Error(`Unknown action: ${payload.action}`);
    }

    return NextResponse.json("OK");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
