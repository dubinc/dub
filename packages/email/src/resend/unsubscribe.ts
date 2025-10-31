import { resend } from "./client";
import { RESEND_AUDIENCE_ID } from "./constants";

export async function unsubscribe({ email }: { email: string }) {
  if (!resend) {
    console.error(
      "No RESEND_API_KEY is set in the environment variables. Skipping.",
    );
    return;
  }

  return await resend.contacts.remove({
    email,
    audienceId: RESEND_AUDIENCE_ID,
  });
}
