import { deleteLink } from "@/lib/api/links";
import { receiver } from "@/lib/cron";
import prisma from "@/lib/prisma";

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

  const link = await prisma.link.findUnique({
    where: {
      id: linkId,
    },
  });

  if (!link) {
    return new Response("Link not found. Skipping...", { status: 200 });
  }

  if (link.userId) {
    return new Response("Link claimed. Skipping...", { status: 200 });
  }

  await deleteLink(link.id);

  return new Response("Link deleted.", { status: 200 });
}
