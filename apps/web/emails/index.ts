import { resend } from "@/lib/resend";
import { CreateEmailOptions } from "resend";

export const sendEmail = async ({
  email,
  subject,
  from,
  bcc,
  replyToFromEmail,
  text,
  react,
  scheduledAt,
  marketing,
}: Omit<CreateEmailOptions, "to" | "from"> & {
  email: string;
  from?: string;
  replyToFromEmail?: boolean;
  marketing?: boolean;
}) => {
  if (process.env.NODE_ENV === "development" && !resend) {
    // Set up a fake email client for development
    console.info(
      `Email to ${email} with subject ${subject} sent from ${
        from || process.env.NEXT_PUBLIC_APP_NAME
      }`,
    );
    return Promise.resolve();
  } else if (!resend) {
    console.error(
      "Resend is not configured. You need to add a RESEND_API_KEY in your .env file for emails to work.",
    );
    return Promise.resolve();
  }

  return resend.emails.send({
    to: email,
    from:
      from ||
      (marketing
        ? "Steven from Dub.co <steven@ship.dub.co>"
        : "Dub.co <system@dub.co>"),
    bcc: bcc,
    ...(!replyToFromEmail && {
      replyTo: "support@dub.co",
    }),
    subject: subject,
    text: text,
    react: react,
    scheduledAt,
    ...(marketing && {
      headers: {
        "List-Unsubscribe": "https://app.dub.co/account/settings",
      },
    }),
  });
};
