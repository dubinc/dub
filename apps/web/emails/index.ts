import { render } from "@react-email/render";
import { Client } from "postmark";
import { JSXElementConstructor, ReactElement } from "react";

export const client = new Client(process.env.POSTMARK_API_KEY as string);

export const sendEmail = async ({
  email,
  subject,
  text,
  react,
  marketing,
}: {
  email: string;
  subject: string;
  text?: string;
  react?: ReactElement<any, string | JSXElementConstructor<any>>;
  marketing?: boolean;
}) => {
  if (!process.env.POSTMARK_API_KEY) {
    console.log(
      "Postmark is not configured. You need to add a POSTMARK_API_KEY in your .env file for emails to work.",
    );
    return Promise.resolve();
  }

  return client.sendEmail({
    From: marketing
      ? "steven@ship.dub.co"
      : process.env.NEXT_PUBLIC_IS_DUB
        ? "system@dub.co"
        : `${process.env.NEXT_PUBLIC_APP_NAME} <system@${process.env.NEXT_PUBLIC_APP_DOMAIN}>`,
    To: email,
    Subject: subject,
    ...(text && { TextBody: text }),
    ...(react && { HtmlBody: render(react) }),
    ...(marketing && {
      MessageStream: "broadcast",
    }),
  });
};
