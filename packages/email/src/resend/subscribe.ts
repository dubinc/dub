import { resend } from "./client";
import { RESEND_AUDIENCE_ID } from "./constants";

export async function subscribe({
  email,
  name,
}: {
  email: string;
  name?: string | null;
}) {
  if (!resend) {
    console.error(
      "No RESEND_API_KEY is set in the environment variables. Skipping.",
    );
    return;
  }

  if (email.endsWith("@dub-internal-test.com")) {
    // don't subscribe internal test emails
    return;
  }

  return await resend.contacts.create({
    email,
    ...(name && {
      firstName: name.split(" ")[0],
      lastName: name.split(" ").slice(1).join(" "),
    }),
    audienceId: RESEND_AUDIENCE_ID,
  });
}
