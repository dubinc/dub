import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { importAffiliates } from "@/lib/tolt/import-affiliates";
import { importSteps } from "@/lib/tolt/importer";
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

    const { programId, action, startingAfter } = schema.parse(
      JSON.parse(rawBody),
    );

    console.log("Request body", { programId, action, startingAfter });

    switch (action) {
      case "import-affiliates":
        await importAffiliates({
          programId,
          startingAfter,
        });
        break;
    }

    return NextResponse.json("OK");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
