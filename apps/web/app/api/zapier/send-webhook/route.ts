import { transformLink } from "@/lib/api/links";
import { receiver } from "@/lib/cron";
import { prisma } from "@/lib/prisma";

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

  // Find the link
  const link = await prisma.link.findUniqueOrThrow({
    where: { id: linkId },
    include: {
      tags: {
        select: {
          tag: true,
        },
      },
    },
  });

  const transformedLink = transformLink(link);

  // Find the Zapier hooks for the project
  const zapierHooks = await prisma.zapierHook.findMany({
    where: {
      projectId: link.projectId!,
    },
  });

  if (zapierHooks.length === 0) {
    return new Response("OK");
  }

  // Send the response to each Zapier hook
  for (const hook of zapierHooks) {
    const response = await fetch(hook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(transformedLink),
    });

    const json = await response.json();

    console.info(
      `[Zapier] Webhook to ${hook.url} for link ${link.id} responded with ${response.status}`,
      json,
    );

    // Zap has unsubscribed
    if (response.status === 401) {
      await prisma.zapierHook.delete({
        where: {
          id: hook.id,
        },
      });
    }
  }

  return new Response("OK");
}
