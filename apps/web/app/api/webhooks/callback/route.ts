import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import z from "@/lib/zod";

const schema = z.object({
  status: z.number(),
  body: z.string(),
  sourceMessageId: z.string(),
  url: z.string(),
  sourceBody: z.string(),
  createdAt: z.number(),
});

// POST /api/webhooks/callback – listen to webhooks status from QStash
export const POST = async (req: Request) => {
  const body = await req.json();

  await verifyQstashSignature(req, body);

  const parsedPayload = schema.parse(body);

  console.log("Webhook callback", parsedPayload);

  // TODO:
  // Store the logs in TB

  return new Response("OK");
};
