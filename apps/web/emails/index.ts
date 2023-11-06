import { nanoid } from "@dub/utils";
import { JSXElementConstructor, ReactElement } from "react";
import { Resend } from "resend";
import { renderAsync } from "@react-email/render";

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const sendEmail = async ({
  email,
  subject,
  react,
  marketing,
  test,
}: {
  email: string;
  subject: string;
  react: ReactElement<any, string | JSXElementConstructor<any>>;
  marketing?: boolean;
  test?: boolean;
}) => {
  if (!resend) {
    console.log(
      "Resend is not configured. You need to add a RESEND_API_KEY in your .env file for emails to work.",
    );
    return Promise.resolve();
  }
  // TODO: remove patch fix when this is fixed https://github.com/resendlabs/resend-node/issues/256
  const html = await renderAsync(react);
  return resend.emails.send({
    from: marketing
      ? "Steven from Dub <steven@ship.dub.co>"
      : "Dub <system@dub.co>",
    to: test ? "delivered@resend.dev" : email,
    subject,
    html,
    headers: {
      "X-Entity-Ref-ID": nanoid(),
    },
  });
};
