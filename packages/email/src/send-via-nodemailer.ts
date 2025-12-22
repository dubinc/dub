import { pretty, render } from "@react-email/render";
import nodemailer from "nodemailer";
import { CreateEmailOptions } from "resend";

// Send email using NodeMailer (Recommended for local development)
export const sendViaNodeMailer = async ({
  to,
  subject,
  text,
  react,
}: Pick<CreateEmailOptions, "subject" | "text" | "react"> & {
  to: string;
}) => {
  const transporter = nodemailer.createTransport({
    // @ts-ignore (Fix this)
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

  return await transporter.sendMail({
    from: "noreply@example.com",
    to,
    subject,
    text,
    html: await pretty(await render(react)),
  });
};
