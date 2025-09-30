import { resend } from "./resend";
import { VARIANT_TO_FROM_MAP, RESEND_REPLY_TO } from "./resend/constants";
import { ResendEmailOptions } from "./resend/types";

// Send email using Resend (Recommended for production)
export const sendEmailViaResend = async (opts: ResendEmailOptions) => {
  if (!resend) {
    console.info(
      "RESEND_API_KEY is not set in the .env. Skipping sending email.",
    );
    return;
  }

  const {
    email,
    from,
    variant = "primary",
    bcc,
    replyTo = RESEND_REPLY_TO,
    subject,
    text,
    react,
    scheduledAt,
  } = opts;

  return await resend.emails.send({
    to: email,
    from: from || VARIANT_TO_FROM_MAP[variant],
    bcc: bcc,
    replyTo,
    subject,
    text,
    react,
    scheduledAt,
    ...(variant === "marketing" && {
      headers: {
        "List-Unsubscribe": "https://app.dub.co/account/settings",
      },
    }),
  });
};
