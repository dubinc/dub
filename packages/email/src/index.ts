import { CreateEmailOptions } from "resend";
import { CUSTOMER_IO_TEMPLATES } from "./constants";
import { resend, sendEmailViaResend } from "./resend";
import { sendViaCustomerIO } from "./send-via-customerio";
import { sendViaNodeMailer } from "./send-via-nodemailer";

export { CUSTOMER_IO_TEMPLATES };

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
  messageData,
  customerId,
}: Omit<CreateEmailOptions, "to" | "from"> & {
  email: string;
  from?: string;
  marketing?: boolean;
  template?: string;
  messageData?: Record<string, string>;
  customerId?: string;
}) => {
  console.log("Sending email");
  console.log("template", template);
  console.log(
    "process.env.CUSTOMER_IO_API_KEY",
    process.env.CUSTOMER_IO_API_KEY,
  );
  // If template is provided, use Customer.io transactional API
  if (template && process.env.CUSTOMER_IO_API_KEY) {
    return await sendViaCustomerIO(template, email, messageData, customerId);
  }

  if (!template) {
    return;
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
    "Email sending failed: No email service is configured. Please set up at least one email service (Customer.io, Resend, or SMTP) to send emails.",
  );
};
