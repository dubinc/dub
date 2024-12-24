import { resend } from "@/lib/resend";
import { render } from "@react-email/components";
import nodemailer from "nodemailer";
import { ReactElement } from "react";
import { CreateEmailOptions } from "resend";
import { sendEmailViaResend } from "./send-via-resend";

// Send email using SMTP (Recommended for local development)
const sendEmailViaSMTP = async ({
  email,
  subject,
  text,
  react,
}: Pick<CreateEmailOptions, "subject" | "text" | "react"> & {
  email: string;
}) => {
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

  console.info("Email sent: %s", info.messageId);
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
  if (resend) {
    return await sendEmailViaResend({
      email,
      subject,
      from,
      bcc,
      replyToFromEmail,
      text,
      react,
      scheduledAt,
      marketing,
    });
  }

  // Fallback to SMTP if Resend is not configured
  const smtpConfigured = Boolean(
    process.env.SMTP_HOST && process.env.SMTP_PORT,
  );

  if (smtpConfigured) {
    return await sendEmailViaSMTP({
      email,
      subject,
      text,
      react,
    });
  }

  console.info(
    "Email sending failed: Neither SMTP nor Resend is configured. Please set up at least one email service to send emails.",
  );
};
