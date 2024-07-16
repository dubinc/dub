import { render } from "@react-email/render";
import { Client } from "postmark";
import { JSXElementConstructor, ReactElement } from "react";

export const client = process.env.POSTMARK_API_KEY
  ? new Client(process.env.POSTMARK_API_KEY)
  : null;

export const sendEmail = async ({
  email,
  subject,
  from,
  bcc,
  text,
  react,
  marketing,
}: {
  email: string;
  subject: string;
  from?: string;
  bcc?: string;
  text?: string;
  react?: ReactElement<any, string | JSXElementConstructor<any>>;
  marketing?: boolean;
}) => {
  return true

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
      "Postmark is not configured. You need to add a POSTMARK_API_KEY in your .env file for emails to work.",
    );
    return Promise.resolve();
  }

  return client.sendEmail({
    From:
      from || marketing
        ? "steven@ship.dub.co"
        : process.env.NEXT_PUBLIC_IS_DUB
          ? "system@dub.co"
          : `${process.env.NEXT_PUBLIC_APP_NAME} <system@${process.env.NEXT_PUBLIC_APP_DOMAIN}>`,
    To: email,
    Bcc: bcc,
    ReplyTo: process.env.NEXT_PUBLIC_IS_DUB
      ? "support@dub.co"
      : `support@${process.env.NEXT_PUBLIC_APP_DOMAIN}`,
    Subject: subject,
    ...(text && { TextBody: text }),
    ...(react && { HtmlBody: render(react) }),
    ...(marketing && {
      MessageStream: "broadcast",
    }),
  });
};
