import { receiver } from "@/lib/cron";
import { sendEmail } from "emails";
import APIKeyCreated from "emails/api-key-created";

export async function POST(req: Request) {
  const body = await req.json();
  if (process.env.VERCEL === "1") {
    const isValid = await receiver.verify({
      signature: req.headers.get("Upstash-Signature") || "",
      body: JSON.stringify(body),
    });
    if (!isValid) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const { type, props } = body;

  if (type === "API_KEY_CREATED") {
    await sendEmail({
      email: props.email,
      subject: "New API Key Created",
      react: APIKeyCreated({
        email: props.email,
        apiKeyName: props.apiKeyName,
      }),
    });
  }

  return new Response("Notification sent.", { status: 200 });
}
