import { resend, sendEmailViaResend } from "./resend";
import { ResendEmailOptions } from "./resend/types";
import { sendViaNodeMailer } from "./send-via-nodemailer";

export const sendEmail = async (opts: ResendEmailOptions) => {
  if (resend) {
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
