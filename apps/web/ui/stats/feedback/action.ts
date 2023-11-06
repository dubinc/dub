"use server";
import { resend } from "emails";
import { renderAsync } from "@react-email/render";
import FeedbackEmail from "emails/feedback-email";

export async function submitFeedback(data: FormData) {
  const email = data.get("email") as string;
  const feedback = data.get("feedback") as string;

  const html = await renderAsync(
    FeedbackEmail({
      email,
      feedback,
    }),
  );

  return await resend?.emails.send({
    from: "feedback@dub.co",
    to: ["steven@dub.co"],
    ...(email && { reply_to: email }),
    subject: "🎉 New Feedback Received!",
    html,
  });
}
