"use server";

export async function submitFeedback(data: FormData) {
  const email = data.get("email") as string;
  const feedback = data.get("feedback") as string;

  return await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + process.env.RESEND_API_KEY,
    },
    body: JSON.stringify({
      from: "feedback@dub.co",
      to: "steven@dub.co",
      reply_to: email,
      ...(email && { reply_to: email }),
      subject: "🎉 New Feedback Received!",
      text: feedback,
    }),
  });
}
