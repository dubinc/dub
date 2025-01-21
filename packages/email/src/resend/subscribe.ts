import { resend } from ".";

export async function subscribe({
  email,
  name,
}: {
  email: string;
  name?: string | null;
}) {
  const audienceId = process.env.RESEND_AUDIENCE_ID;

  if (!audienceId) {
    console.error("RESEND_AUDIENCE_ID is not set in the .env. Skipping.");
    return;
  }

  return await resend?.contacts.create({
    email,
    ...(name && {
      firstName: name.split(" ")[0],
      lastName: name.split(" ").slice(1).join(" "),
    }),
    audienceId,
  });
}
