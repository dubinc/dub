import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { completeTests } from "@/lib/api/links/complete-tests";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@dub/prisma";

/**
 * Completes a link's tests if they're ready, scheduled by QStash
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { linkId } = JSON.parse(rawBody);

    const link = await prisma.link.findUnique({
      where: {
        id: linkId,
      },
      include: {
        project: true,
      },
    });

    if (!link || !link.project)
      return new Response("Link not found. Skipping...", { status: 200 });

    if (
      link.tests &&
      link.testsCompleteAt &&
      link.testsCompleteAt < new Date() &&
      Date.now() - link.testsCompleteAt.getTime() < 2 * 60 * 60 * 1000 // Limit to two hour window
    ) {
      await completeTests(link as any);
      return new Response("Tests completed.", { status: 200 });
    }

    return new Response("No test completion necessary.", { status: 200 });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
