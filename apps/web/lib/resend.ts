import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export async function subscribe({
  email,
  name,
}: {
  email: string;
  name?: string | null;
}) {
  const [firstName, ...lastName] = name ? name.split(" ") : [];

  if (!process.env.RESEND_API_KEY || !process.env.RESEND_AUDIENCE_ID) {
    console.error("Resend API key or audience ID not found");
    return;
  }

  return await resend.contacts.create({
    email,
    firstName,
    lastName: lastName.length > 0 ? lastName.join(" ") : undefined,
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
