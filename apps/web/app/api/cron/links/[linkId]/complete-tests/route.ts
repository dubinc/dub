import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { completeABTests } from "@/lib/api/links/complete-ab-tests";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@dub/prisma";

// POST - /api/cron/links/[linkId]/complete-tests
// Completes a link's AB tests if they're ready, scheduled by QStash
export async function POST(
  req: Request,
  {
    params: { linkId },
  }: {
    params: { linkId: string };
  },
) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const link = await prisma.link.findUnique({
      where: {
        id: linkId,
      },
      include: {
        project: true,
      },
    });

    if (!link) {
      return new Response(`Link ${linkId} not found. Skipping...`);
    }

    if (
      link.testVariants &&
      link.testCompletedAt &&
      link.testCompletedAt < new Date() &&
      Date.now() - link.testCompletedAt.getTime() < 2 * 60 * 60 * 1000 // Limit to two hour window
    ) {
      await completeABTests(link as any);

      return new Response(`Tests completed for link ${linkId}.`);
    }

    return new Response(`No test completion necessary for link ${linkId}.`);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
