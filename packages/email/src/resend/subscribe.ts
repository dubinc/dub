import { resend, RESEND_AUDIENCES } from ".";

export async function subscribe({
  email,
  name,
  audience = "app.dub.co",
}: {
  email: string;
  name?: string | null;
  audience?: keyof typeof RESEND_AUDIENCES;
}) {
  if (!resend) {
    console.error("RESEND_API_KEY is not set in the .env. Skipping.");
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
