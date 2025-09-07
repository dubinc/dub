import { ResendEmailOptions } from "./resend/types";
import { sendViaNodeMailer } from "./send-via-nodemailer";
import { sendEmailViaResend } from "./send-via-resend";

export const sendEmail = async (opts: ResendEmailOptions) => {
  if (process.env.RESEND_API_KEY) {
    return await sendEmailViaResend(opts);
  }

  // Fallback to SMTP if Resend is not configured
  const smtpConfigured = Boolean(
    process.env.SMTP_HOST && process.env.SMTP_PORT,
  );

  if (smtpConfigured) {
    const { email, subject, text, react } = opts;
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
