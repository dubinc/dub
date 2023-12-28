import { receiver } from "@/lib/cron";
import prisma from "@/lib/prisma";
import { GOOGLE_FAVICON_URL, getApexDomain, log } from "@dub/utils";

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
    return new Response("Link not found", { status: 200 });
  }

  const invalidFavicon = await fetch(
    `${GOOGLE_FAVICON_URL}${getApexDomain(link.url)}`,
  ).then((res) => !res.ok);

  if (invalidFavicon) {
    await log({
      message: `Suspicious link detected: ${link.domain}/${link.key} → ${link.url}`,
      type: "links",
      mention: true,
    });
  }

  return new Response("OK", { status: 200 });
}
