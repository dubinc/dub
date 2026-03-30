import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { withCron } from "@/lib/cron/with-cron";
import { runTrialEmailCron } from "@/lib/email/run-trial-email-cron";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, log } from "@dub/utils";
import * as z from "zod/v4";
import { logAndRespond } from "../utils";

export const dynamic = "force-dynamic";

const QSTASH_CONTINUATION_DELAY_SECONDS = 2;

const postBodySchema = z.object({
  startingAfter: z.string(),
});

/**
 * Sends the paid-plan trial marketing sequence (see `lib/email/trial-email-schedule.ts`).
 * Runs on a schedule (cron). Eligibility is `trialEndsAt` in the future + `SentEmail` dedupe.
 *
 * Complements the generic welcome email (`/api/cron/welcome-user`): free-only signups get welcome only;
 * users who start a trial get welcome (QStash) + these emails when due.
 */

async function executeTrialEmailCronPage(startingAfter?: string) {
  const now = new Date();
  const result = await runTrialEmailCron({
    now,
    prisma,
    startingAfter,
  });

  if (result.workspaceCount === 0) {
    if (startingAfter) {
      return logAndRespond(
        "Trial email cron: no workspaces on continuation page (done).",
      );
    }

    return logAndRespond("No workspaces in active trial. Skipping.");
  }

  if (result.hasMore && result.nextStartingAfter) {
    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/trial-emails`,
      method: "POST",
      delay: QSTASH_CONTINUATION_DELAY_SECONDS,
      body: {
        startingAfter: result.nextStartingAfter,
      },
    });
  }

  return logAndRespond(
    `Trial email cron: sent ${result.sentCount} email(s) for ${result.workspaceCount} workspace(s)${result.hasMore ? "; next page enqueued." : "."}`,
  );
}

// GET /api/cron/trial-emails
export const GET = withCron(async () => executeTrialEmailCronPage(undefined));

// POST /api/cron/trial-emails
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    const { startingAfter } = postBodySchema.parse(JSON.parse(rawBody));

    return await executeTrialEmailCronPage(startingAfter);
  } catch (error) {
    await log({
      message:
        "Trial email cron (continuation) failed. Error: " +
        (error instanceof Error ? error.message : String(error)),
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}
