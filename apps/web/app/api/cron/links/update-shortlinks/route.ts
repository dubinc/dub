import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@dub/prisma";
import { linkConstructorSimple } from "@dub/utils/src";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  linkIds: z.array(z.string()),
});

// This route is used to update the shortlink column for a list of links.
// POST /api/cron/links/update-shortlinks
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { linkIds } = schema.parse(JSON.parse(rawBody));

    const links = await prisma.link.findMany({
      where: {
        id: {
          in: linkIds,
        },
      },
      select: {
        id: true,
        domain: true,
        key: true,
      },
    });

    if (!links || links.length === 0) {
      return new Response("No links found.");
    }

    await Promise.all(
      links.map((link) =>
        prisma.link.update({
          where: {
            id: link.id,
          },
          data: {
            shortLink: linkConstructorSimple({
              domain: link.domain,
              key: link.key,
            }),
          },
        }),
      ),
    );

    return new Response(`Updated ${links.length} links.`);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
