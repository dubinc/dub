import { resend } from "@/lib/resend";
import { CreateEmailOptions } from "resend";

export const sendEmailViaResend = async ({
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
