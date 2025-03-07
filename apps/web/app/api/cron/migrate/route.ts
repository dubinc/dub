import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { encodeKeyIfCaseSensitive } from "@/lib/api/links/case-sensitivity";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK, linkConstructorSimple, log } from "@dub/utils";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/***
    One off cron to migrate
*/
async function handler(req: Request) {
  const domain = "buff.ly";
  const userId = "user_EzRuKzR9sG3WmHapVV6aEec7";
  const oldFolderId = "fold_LIZsdjTgFVbQVGYSUmYAi5vT";
  const newFolderId = "fold_1JNQBVZV8P0NA0YGB11W2HHSQ";

  try {
    if (req.method === "GET") {
      await verifyVercelSignature(req);
    } else if (req.method === "POST") {
      await verifyQstashSignature({
        req,
        rawBody: await req.text(),
      });
    }

    const where: Prisma.LinkWhereInput = {
      userId,
      domain,
      folderId: oldFolderId,
      createdAt: {
        lte: new Date("2025-03-07T16:33:32.084Z"),
      },
    };

    const links = await prisma.link.findMany({
      where,
      select: {
        id: true,
        domain: true,
        key: true,
        shortLink: true,
      },
      take: 100,
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!links.length) {
      console.log("No more links to migrate.");
      return NextResponse.json({ message: "Successfully migrated all links" });
    }

    const remainingLinks = await prisma.link.count({
      where,
    });

    console.log(
      `Remaining links to migrate after this batch: ${remainingLinks - 100}`,
    );

    await Promise.allSettled(
      links.map(async (link) => {
        const newKey = encodeKeyIfCaseSensitive({
          domain,
          key: link.key,
        });

        const newShortLink = linkConstructorSimple({
          domain,
          key: newKey,
        });

        await prisma.link.update({
          where: {
            id: link.id,
          },
          data: {
            key: newKey,
            shortLink: newShortLink,
            folderId: newFolderId,
          },
        });

        console.log(
          `Updated link ${link.id} from ${link.shortLink} to ${newShortLink} and new folder ${newFolderId}`,
        );
      }),
    );

    // expire the Redis cache for the links so it fetches the latest version from the database
    await linkCache.expireMany(links);

    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/migrate`,
      method: "POST",
      body: {},
    });

    return NextResponse.json({
      status: `Migrated ${links.length} links, ${remainingLinks - 100} remaining...`,
    });
  } catch (error) {
    await log({
      message: `Links and domain cleanup failed - ${error.message}`,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}

export { handler as GET, handler as POST };
