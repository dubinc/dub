import { postmark } from "@/lib/postmark";
import { render } from "@react-email/render";
import { JSXElementConstructor, ReactElement } from "react";

export const sendEmail = async ({
  email,
  subject,
  from,
  text,
  react,
  marketing,
}: {
  email: string;
  subject: string;
  from?: string;
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

  return postmark.sendEmail({
    From:
      from || marketing
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
