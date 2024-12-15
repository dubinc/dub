import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { NextResponse } from "next/server";
import { z } from "zod";
import { processInvoice } from "./utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  invoiceId: z.string(),
});

// POST /api/cron/invoices
export async function POST(req: Request) {
  try {
    const body = await req.json();
    await verifyQstashSignature(req, body);

    const { invoiceId } = schema.parse(body);

    await processInvoice({ invoiceId });

    return NextResponse.json({ message: `Invoice ${invoiceId} processed.` });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
