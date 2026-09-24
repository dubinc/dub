import { sendPayoutReminder } from "@/lib/payouts/send-payout-reminder";
import * as z from "zod/v4";
import { defineJob } from "../index";

const inputSchema = z.object({});

// Sends ConnectPayoutReminder emails to partners with pending payouts
// who have not configured payouts yet.
export const sendConnectPayoutRemindersJob = defineJob({
  name: "send-connect-payout-reminders-job",
  schema: inputSchema,
  async handle() {
    const hasMore = await sendPayoutReminder();

    if (hasMore) {
      await sendConnectPayoutRemindersJob.dispatch({});
    }
  },
});
