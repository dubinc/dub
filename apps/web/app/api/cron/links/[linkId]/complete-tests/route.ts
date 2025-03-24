import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { completeTests } from "@/lib/api/links/complete-tests";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@dub/prisma";

/**
 * Completes a link's tests if they're ready, scheduled by QStash
 */
export async function POST(
  req: Request,
  { params = {} }: { params: Record<string, string> | undefined },
) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { linkId } = params;

    if (!linkId) return new Response("Link ID is required.", { status: 400 });

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
      link.testVariants &&
      link.testCompletedAt &&
      link.testCompletedAt < new Date() &&
      Date.now() - link.testCompletedAt.getTime() < 2 * 60 * 60 * 1000 // Limit to two hour window
    ) {
      await completeTests(link as any);
      return new Response("Tests completed.", { status: 200 });
    }

    return new Response("No test completion necessary.", { status: 200 });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
