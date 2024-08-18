import { JSXElementConstructor, ReactElement } from "react";

import { Resend } from "resend";

export const client = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async ({
  email,
  subject,
  from,
  bcc,
  replyToFromEmail,
  text,
  react,
  marketing,
}: {
  email: string;
  subject: string;
  from?: string;
  bcc?: string;
  replyToFromEmail?: boolean;
  text?: string;
  react?: ReactElement<any, string | JSXElementConstructor<any>>;
  marketing?: boolean;
}) => {
  if (process.env.NODE_ENV === "development" && !client) {
    // Set up a fake email client for development
    console.info(
      `Email to ${email} with subject ${subject} sent from ${
        from || process.env.NEXT_PUBLIC_APP_NAME
      }`,
    );
    return Promise.resolve();
  } else if (!client) {
    console.error(
      "Resend is not configured. You need to add a RESEND_API_KEY in your .env file for emails to work.",
    );
    return Promise.resolve();
  }

  return client.emails.send({
    from:
      from ||
      (marketing
        ? "steven@ship.dub.co"
        : process.env.NEXT_PUBLIC_IS_DUB
          ? "system@dub.co"
          : `${process.env.NEXT_PUBLIC_APP_NAME} <system@${process.env.NEXT_PUBLIC_APP_DOMAIN}>`),
    to: email,
    bcc: bcc,
    ...(!replyToFromEmail && {
      replyTo: process.env.NEXT_PUBLIC_IS_DUB
        ? "support@dub.co"
        : `support@${process.env.NEXT_PUBLIC_APP_DOMAIN}`,
    }),
    subject: subject,
    text: text,
    react: react,
  });
};
