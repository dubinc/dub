import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export async function subscribe({
  email,
  name,
}: {
  email: string;
  name?: string | null;
}) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_AUDIENCE_ID) {
    console.error("Resend API key or audience ID not found");
    return;
  }

  return await resend.contacts.create({
    email,
    ...(name && {
      firstName: name.split(" ")[0],
      lastName: name.split(" ").slice(1).join(" "),
    }),
    unsubscribed: false,
    audienceId: process.env.RESEND_AUDIENCE_ID as string,
  });
}

export async function unsubscribe({ email }: { email: string }) {
  return await resend.contacts.remove({
    email,
    audienceId: process.env.RESEND_AUDIENCE_ID as string,
  });
}
