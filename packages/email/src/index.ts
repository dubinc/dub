import { CreateEmailOptions } from "resend";
import { resend, sendEmailViaResend } from "./resend";
import { sendViaNodeMailer } from "./send-via-nodemailer";

export const sendEmail = async ({
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
  if (resend) {
    return await sendEmailViaResend({
      email,
      replyTo,
      subject,
      from,
      bcc,
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
    return await sendViaNodeMailer({
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
