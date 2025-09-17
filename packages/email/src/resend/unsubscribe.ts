import { resend } from "./client";
import { RESEND_AUDIENCES } from "./constants";

export async function unsubscribe({
  email,
  audience = "app.dub.co",
}: {
  email: string;
  audience?: keyof typeof RESEND_AUDIENCES;
}) {
  if (!resend) {
    console.error(
      "No RESEND_API_KEY is set in the environment variables. Skipping.",
    );
    return;
  }

  const audienceId = RESEND_AUDIENCES[audience];

  return await resend.contacts.remove({
    email,
    audienceId,
  });
}
