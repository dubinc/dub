import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import z from "@/lib/zod";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";
import { newSaleCreated } from "./new-sale-created";

const schema = z.object({
  event: z.string(),
  payload: z.record(z.any()),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    await verifyQstashSignature(req, body);

    const { event, payload } = schema.parse(body);

    switch (event) {
      case "new-sale-created":
        await newSaleCreated(payload);
        break;
    }

    return NextResponse.json({
      response: "success",
    });
  } catch (error) {
    await log({
      message: `Error transferring domain: ${error.message}`,
      type: "cron",
    });

    return handleAndReturnErrorResponse(error);
  }
}
