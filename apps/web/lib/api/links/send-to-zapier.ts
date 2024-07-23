import { prisma } from "@/lib/prisma";

export const sendToZapier = async (link) => {
  if (!link.projectId) {
    return;
  }

  const zapierHooks = await prisma.zapierHook.findMany({
    where: {
      projectId: link.projectId,
    },
  });

  if (zapierHooks.length === 0) {
    return;
  }

  // Send the response to each Zapier hook
  for (const hook of zapierHooks) {
    const response = await fetch(hook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(link),
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
};
