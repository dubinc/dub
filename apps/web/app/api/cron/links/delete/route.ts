import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { deleteLink } from "@/lib/api/links";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@dub/prisma";

export const dynamic = "force-dynamic";

/*
    This route is used to delete demo links that are not claimed
    It is called by QStash 30 minutes after a demo link is created
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
    });

    if (!link) {
      return new Response("Link not found. Skipping...", { status: 200 });
    }

    if (link.userId) {
      return new Response("Link claimed. Skipping...", { status: 200 });
    }

    await deleteLink(link.id);

    return new Response("Link deleted.", { status: 200 });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
