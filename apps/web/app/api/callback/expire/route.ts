import { receiver } from "@/lib/cron";
import prisma from "@/lib/prisma";
import { redis } from "@/lib/upstash";

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

  const { linkId } = body;
  if (!linkId) {
    return new Response("Missing link ID", { status: 200 });
  }

  const link = await prisma.link.findUnique({
    where: {
      id: linkId,
    },
    select: {
      domain: true,
      key: true,
      expiresAt: true,
    },
  });

  if (!link) {
    return new Response("Link not found", { status: 200 });
  }

  if (!link.expiresAt || link.expiresAt > new Date()) {
    return new Response(
      "Link is not expired or does not have an expiration date",
      { status: 200 },
    );
  }

  const { domain, key } = link;

  const redisLink = await redis.get(`${domain}:${key}`);

  if (!redisLink) {
    return new Response("Link not found", { status: 404 });
  }

  await redis.set(`${domain}:${key}`, {
    ...redisLink,
    expired: true,
  });

  return new Response("Successfully expired link", { status: 200 });
}
