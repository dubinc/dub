import { withCron } from "@/lib/cron/with-cron";
import { dispatchWorkflows } from "@/lib/jobs/publish-workflows";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  invoiceId: z.string(),
});

// POST /api/cron/domains/renewal-succeeded - Deprecated, renewals run in /api/workflows/renew-domains.
// Kept so that messages queued before the move still renew their domains. Safe to remove once none are left in QStash.
export const POST = withCron(async ({ rawBody }) => {
  const { invoiceId } = inputSchema.parse(JSON.parse(rawBody));

  const { results } = await dispatchWorkflows({
    name: "renew-domains-workflow",
    payload: {
      invoiceId,
    },
    options: {
      deduplicationId: `domain-renewal-${invoiceId}`,
      label: invoiceId,
    },
  });

  const [result] = results;

  // Return a 500 so that QStash redelivers the message, since the outbox write for a failed dispatch can also fail
  if (result?.status !== "published") {
    return logAndRespond(
      `Failed to trigger renew domains workflow for invoice ${invoiceId}: ${result?.lastError}`,
      {
        status: 500,
        logLevel: "error",
      },
    );
  }

  return logAndRespond(
    `Renew domains workflow published for invoice ${invoiceId}.`,
  );
});
