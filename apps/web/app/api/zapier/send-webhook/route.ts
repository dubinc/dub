import { transformLink } from "@/lib/api/links";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@/lib/prisma";

// POST /api/zapier/send-webhook - Send payload to Zapier hooks
export async function POST(req: Request) {
  const body = await req.json();

  await verifyQstashSignature(req, body);

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
