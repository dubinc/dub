import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { encodeKeyIfCaseSensitive } from "@/lib/api/links/case-sensitivity";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK, linkConstructorSimple } from "@dub/utils";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/***
    One off cron to migrate
*/
export async function POST(req: Request) {
  const domain = "buff.ly";
  const userId = "user_EzRuKzR9sG3WmHapVV6aEec7";
  const oldFolderId = "fold_LIZsdjTgFVbQVGYSUmYAi5vT";
  const newFolderId = "fold_1JNQBVZV8P0NA0YGB11W2HHSQ";

  try {
    await verifyQstashSignature({
      req,
      rawBody: await req.text(),
    });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
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

  console.log(`Found ${links.length} links to migrate...`);

  if (!links.length) {
    console.log("No more links to migrate.");
    return NextResponse.json({ message: "Successfully migrated all links" });
  }

  const linksToDelete: string[] = [];

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

      try {
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
      } catch (error) {
        // if the link already exists, delete it
        if (error.code === "P2002") {
          console.log(
            `Link ${link.id} (${link.domain}/${link.key}) already exists, deleting...`,
          );
          linksToDelete.push(link.id);
        }
      }
    }),
  );

  if (linksToDelete.length) {
    console.log(`Deleting ${linksToDelete.length} links...`);
    await prisma.link.deleteMany({
      where: {
        id: { in: linksToDelete },
      },
    });
  }

  // expire the Redis cache for the links so it fetches the latest version from the database
  await linkCache.expireMany(links);

  await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/migrate`,
    method: "POST",
    body: {},
  });

  return NextResponse.json({
    status: `Migrated ${links.length} links and deleted ${linksToDelete.length} links.`,
  });
}
