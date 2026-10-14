import { sendPayoutReminder } from "@/lib/payouts/send-payout-reminder";
import * as z from "zod/v4";
import { defineJob } from "../index";

const inputSchema = z.object({
  afterPartnerId: z.string().optional(),
  batchNumber: z.number().int().positive().default(1),
});

// Sends ConnectPayoutReminder emails to partners with pending payouts
// who have not configured payouts yet.
export const sendConnectPayoutRemindersJob = defineJob({
  name: "send-connect-payout-reminders-job",
  schema: inputSchema,
  async handle({ afterPartnerId, batchNumber }) {
    const nextAfterPartnerId = await sendPayoutReminder({
      afterPartnerId,
      batchNumber,
    });

    if (nextAfterPartnerId) {
      await sendConnectPayoutRemindersJob.dispatch({
        afterPartnerId: nextAfterPartnerId,
        batchNumber: batchNumber + 1,
      });
    }
  },
});
