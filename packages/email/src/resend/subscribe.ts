import { resend } from "./client";
import { RESEND_AUDIENCES } from "./constants";

export async function subscribe({
  email,
  name,
  audience = "app.dub.co",
}: {
  email: string;
  name?: string | null;
  audience?: keyof typeof RESEND_AUDIENCES;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.error(
      "No RESEND_API_KEY is set in the environment variables. Skipping.",
    );
    return;
  }

  if (email.endsWith("@dub-internal-test.com")) {
    // don't subscribe internal test emails
    return;
  }

  const audienceId = RESEND_AUDIENCES[audience];

  return await resend.contacts.create({
    email,
    ...(name && {
      firstName: name.split(" ")[0],
      lastName: name.split(" ").slice(1).join(" "),
    }),
    audienceId,
  });
}
