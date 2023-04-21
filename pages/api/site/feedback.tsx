import { NextApiRequest, NextApiResponse } from "next";
import sendMail from "emails";
import FeedbackEmail from "emails/FeedbackEmail";
import { ratelimit } from "@/lib/upstash";

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

    const response = await sendMail({
      to: "steven@dub.sh",
      from: "feedback@dub.sh",
      ...(email && { replyTo: email }),
      subject: "🎉 New Feedback Received!",
      component: <FeedbackEmail email={email} feedback={feedback} />,
    });
    res.status(200).json({ response });
  } else {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
