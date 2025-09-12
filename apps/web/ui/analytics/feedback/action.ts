"use server";

import { sendEmail } from "@dub/email";
import FeedbackEmail from "@dub/email/templates/feedback-email";

export async function submitFeedback(data: FormData) {
  const email = data.get("email") as string;
  const feedback = data.get("feedback") as string;

  return await sendEmail({
    from: "feedback@dub.co",
    email: "steven@dub.co",
    ...(email && { replyTo: email }),
    subject: "🎉 New Feedback Received!",
    react: FeedbackEmail({ email, feedback }),
  });
}
