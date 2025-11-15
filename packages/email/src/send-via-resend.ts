import { resend } from "./resend";
import { VARIANT_TO_FROM_MAP } from "./resend/constants";
import { ResendBulkEmailOptions, ResendEmailOptions } from "./resend/types";

const resendEmailForOptions = (opts: ResendEmailOptions) => {
  const {
    to,
    from,
    variant = "primary",
    bcc,
    replyTo,
    subject,
    text,
    react,
    scheduledAt,
    headers,
    tags,
  } = opts;

  return {
    to,
    from: from || VARIANT_TO_FROM_MAP[variant],
    bcc: bcc,
    // if replyTo is set to "noreply@dub.co", don't set replyTo
    // else set it to the value of replyTo or fallback to support@dub.co
    ...(replyTo === "noreply" ? {} : { replyTo: replyTo || "support@dub.co" }),
    subject,
    text,
    react,
    scheduledAt,
    tags,
    ...(variant === "marketing"
      ? {
          headers: {
            ...(headers || {}),
            "List-Unsubscribe": "https://app.dub.co/account/settings",
          },
        }
      : {
          headers,
        }),
  };
};

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

export const sendBatchEmailViaResend = async (
  emails: ResendBulkEmailOptions,
  options?: { idempotencyKey?: string },
) => {
  if (!resend) {
    console.info(
      "RESEND_API_KEY is not set in the .env. Skipping sending email.",
    );

    return {
      data: null,
      error: null,
    };
  }

  if (emails.length === 0) {
    return {
      data: null,
      error: null,
    };
  }

  // Filter out emails without to address
  // and format the emails for Resend
  const filteredBatch = emails.reduce(
    (acc, email) => {
      if (!email?.to) {
        return acc;
      }

      acc.push(resendEmailForOptions(email));

      return acc;
    },
    [] as ReturnType<typeof resendEmailForOptions>[],
  );

  if (filteredBatch.length === 0) {
    return {
      data: null,
      error: null,
    };
  }

  const idempotencyKey = options?.idempotencyKey || undefined;

  return await resend.batch.send(
    filteredBatch,
    idempotencyKey ? { idempotencyKey } : undefined,
  );
};
