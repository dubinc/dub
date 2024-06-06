import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { deleteLink } from "@/lib/api/links";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await verifyQstashSignature(req, body);
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
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
