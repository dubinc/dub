import { CreateEmailOptions } from "resend";
import { resend, sendEmailViaResend } from "./resend";
import { sendViaNodeMailer } from "./send-via-nodemailer";
import { sendViaMailchimp, Var } from "./send-via-mailchimp";
import { MAILCHIMP_TEMPLATES } from "./constants";

export { MAILCHIMP_TEMPLATES };

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
  template,
  vars,
}: Omit<CreateEmailOptions, "to" | "from"> & {
  email: string;
  from?: string;
  marketing?: boolean;
  template?: string;
  vars?: Var[];
}) => {
  // If template is provided, use Mailchimp
  if (template && process.env.MAILCHIMP_API_KEY) {
    return await sendViaMailchimp(template, email, vars);
  }

  // Otherwise, follow the existing provider logic
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
    "Email sending failed: No email service is configured. Please set up at least one email service (Mailchimp, Resend, or SMTP) to send emails.",
  );
};
