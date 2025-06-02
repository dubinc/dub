import { resend, RESEND_AUDIENCES } from ".";

export async function unsubscribe({ email }: { email: string }) {
  if (!resend) {
    console.error("RESEND_API_KEY is not set in the .env. Skipping.");
    return;
  }

  // TODO: Update this to support partners.dub.co in the future
  const audienceId = RESEND_AUDIENCES["app.dub.co"];

  return await resend.contacts.remove({
    email,
    audienceId,
  });
}
