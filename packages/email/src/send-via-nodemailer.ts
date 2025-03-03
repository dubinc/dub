import { render } from "@react-email/components";
import nodemailer from "nodemailer";
import { ReactElement } from "react";
import { CreateEmailOptions } from "resend";
import SMTPTransport from "nodemailer/lib/smtp-transport";

// Send email using NodeMailer (Recommended for local development)
export const sendViaNodeMailer = async ({
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
    secure: process.env.SMTP_PORT === "465",
    tls: {
      rejectUnauthorized: false,
    },
  } as SMTPTransport.Options);

  return await transporter.sendMail({
    from: "noreply@example.com",
    to: email,
    subject,
    text,
    html: render(react as ReactElement),
  });
};
