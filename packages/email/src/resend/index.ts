import { CreateEmailOptions, Resend } from "resend";

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Send email using Resend (Recommended for production)
export const sendEmailViaResend = async ({
  email,
  replyTo,
  subject,
  from,
  bcc,
  text,
  react,
  scheduledAt,
  marketing,
}: Omit<CreateEmailOptions, "to" | "from"> & {
  email: string;
  from?: string;
  marketing?: boolean;
}) => {
  if (!resend) {
    console.info(
      "RESEND_API_KEY is not set in the .env. Skipping sending email.",
    );
    return;
  }

  return await resend.emails.send({
    to: email,
    from:
      from ||
      (marketing
        ? "Steven from Dub.co <steven@ship.getqr-dev.vercel.app>"
        : "Dub.co <system@getqr-dev.vercel.app>"),
    bcc: bcc,
    replyTo,
    subject,
    text,
    react,
    scheduledAt,
    ...(marketing && {
      headers: {
        "List-Unsubscribe": "https://app.getqr-dev.vercel.app/account/settings",
      },
    }),
  });
};
