"use server";

import { log } from "#/lib/utils";

export async function submitFeedback(data: FormData) {
  const email = data.get("email") as string;
  const feedback = data.get("feedback") as string;

  return await log({
    message: `New feedback from *${email}*: ${feedback}`,
    type: "cron",
  });
}
