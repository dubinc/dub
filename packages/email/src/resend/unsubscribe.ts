import { resend } from ".";

export async function unsubscribe({ email }: { email: string }) {
  const audienceId = process.env.RESEND_AUDIENCE_ID;

  if (!audienceId) {
    console.error("RESEND_AUDIENCE_ID is not set in the .env. Skipping.");
    return;
  }

  return await resend?.contacts.remove({
    email,
    audienceId,
  });
}
