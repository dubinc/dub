import { resend, RESEND_AUDIENCES } from ".";

export async function unsubscribe({ email }: { email: string }) {
  if (!resend) {
    console.error("Resend client is not properly initialized. Skipping operation.");
    return;
  }

  // TODO: Update this to support partners.dub.co in the future
  const audienceId = RESEND_AUDIENCES["app.dub.co"];

  return await resend.contacts.remove({
    email,
    audienceId,
  });
}
