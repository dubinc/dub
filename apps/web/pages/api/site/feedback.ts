import { NextApiRequest, NextApiResponse } from "next";
import { ratelimit } from "#/lib/upstash";
import { Resend } from "resend";
import FeedbackEmail from "emails/feedback-email";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "POST") {
    const { success } = await ratelimit().limit("feedback");
    if (!success) {
      res.status(429).json({ error: "Don't DDoS me pls 🥺" });
    }

    const { email, feedback } = req.body;
    if (email === "prewarm") {
      return res.status(200).json({ response: "pre-warmed" });
    }
    if (!feedback) {
      return res.status(400).json({ error: "Missing feedback" });
    }

    const response = await resend.emails.send({
      from: "feedback@dub.co",
      to: ["steven@dub.co"],
      ...(email && { reply_to: email }),
      subject: "🎉 New Feedback Received!",
      react: FeedbackEmail({
        email,
        feedback,
      }),
    });
    res.status(200).json({ response });
  } else {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
