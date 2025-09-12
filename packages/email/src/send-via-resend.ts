import { resend } from "./resend";
import { VARIANT_TO_FROM_MAP } from "./resend/constants";
import { ResendBulkEmailOptions, ResendEmailOptions } from "./resend/types";

const resendEmailForOptions = (opts: ResendEmailOptions) => {
  const {
    email,
    from,
    variant = "primary",
    bcc,
    replyTo,
    subject,
    text,
    react,
    scheduledAt,
    headers,
  } = opts;

  return {
    to: email,
    from: from || VARIANT_TO_FROM_MAP[variant],
    bcc: bcc,
    replyTo: replyTo || "support@dub.co",
    subject,
    text,
    react,
    scheduledAt,
    ...(variant === "marketing"
      ? {
        headers: {
          ...headers,
          "List-Unsubscribe": "https://app.dub.co/account/settings",
        },
      }
      : {
        headers,
      }),
  }
}

// Send email using Resend (Recommended for production)
export const sendEmailViaResend = async (opts: ResendEmailOptions) => {
  if (!resend) {
    console.info(
      "RESEND_API_KEY is not set in the .env. Skipping sending email.",
    );
    return;
  }

  return await resend.emails.send(resendEmailForOptions(opts));
};

export const sendBatchEmailViaResend = async (opts: ResendBulkEmailOptions) => {
  if (!resend) {
    console.info(
      "RESEND_API_KEY is not set in the .env. Skipping sending email.",
    );

    return {
      data: [],
      error: null,
    }
  }

  const payload = opts.map(resendEmailForOptions);

  return await resend.batch.send(payload);
};
