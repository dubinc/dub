import { resend } from "@/lib/resend";
import { render } from "@react-email/components";
import nodemailer from "nodemailer";
import { ReactElement } from "react";
import { CreateEmailOptions } from "resend";

// Send email using SMTP (Recommended for local development)
const sendEmailViaSMTP = async ({
  email,
  subject,
  text,
  react,
}: Omit<CreateEmailOptions, "to" | "from"> & {
  email: string;
}) => {
  const smtpConfigured = Boolean(
    process.env.SMTP_HOST && process.env.SMTP_PORT,
  );

  if (!smtpConfigured) {
    console.info("SMTP is not configured. Skipping sending email.");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    secure: false,
    tls: {
      rejectUnauthorized: false,
    },
  });

  const info = await transporter.sendMail({
    from: "noreply@example.com",
    to: email,
    subject,
    text,
    html: render(react as ReactElement),
  });

  console.log("Email sent: %s", info.messageId);
};

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
  if (process.env.NODE_ENV === "development") {
    return await sendEmailViaSMTP({
      email,
      subject,
      text,
      react,
    });
  }

  if (!resend) {
    console.info(
      "RESEND_API_KEY is not set in the .env. Skipping sending email.",
    );
    return;
  }

  return resend?.emails.send({
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
