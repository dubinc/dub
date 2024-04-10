"use server";

import { render } from "@react-email/render";
import { client } from "emails";
import FeedbackEmail from "emails/feedback-email";

export async function submitFeedback(data: FormData) {
  const email = data.get("email") as string;
  const feedback = data.get("feedback") as string;

  const emailHtml = render(FeedbackEmail({ email, feedback }));

  return await client?.sendEmail({
    From: "feedback@dub.co",
    To: "steven@dub.co",
    ...(email && { ReplyTo: email }),
    Subject: "🎉 New Feedback Received!",
    HtmlBody: emailHtml,
  });
}
