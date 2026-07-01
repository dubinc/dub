import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withAdmin } from "@/lib/auth";
import {
  createPartnerContentRunStamp,
  enqueuePartnerContentEnumerate,
  partnerContentIngestionFilterSchema,
} from "@/lib/partner-content-search/ingestion/enqueue";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

const backfillTriggerSchema = z.object({
  filter: partnerContentIngestionFilterSchema,
  runStamp: z.string().min(1).optional(),
  dryRun: z.boolean().default(false),
  dispatcherDryRun: z.boolean().default(false),
});

// POST /api/admin/partner-content/backfill
export const POST = withAdmin(
  async ({ req }) => {
    try {
      const body = backfillTriggerSchema.parse(await parseRequestBody(req));
      const runStamp = body.runStamp ?? createPartnerContentRunStamp();

      const payload = {
        mode: "backfill" as const,
        filter: body.filter,
        runStamp,
        dryRun: body.dispatcherDryRun,
      };

      if (body.dryRun) {
        return NextResponse.json({
          success: true,
          triggerDryRun: true,
          dispatcherDryRun: payload.dryRun,
          wouldEnqueue: false,
          enumeratePayload: payload,
        });
      }

      const qstashResponse = await enqueuePartnerContentEnumerate(payload);

      return NextResponse.json({
        success: true,
        triggerDryRun: false,
        dispatcherDryRun: payload.dryRun,
        wouldEnqueue: true,
        runStamp,
        enumeratePayload: payload,
        qstashResponse,
      });
    } catch (error) {
      return handleAndReturnErrorResponse(error);
    }
  },
  {
    requiredRoles: ["owner"],
  },
);
