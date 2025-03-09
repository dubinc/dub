import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/***
    One off cron to migrate
*/
export async function POST(req: Request) {
  try {
    await verifyQstashSignature({
      req,
      rawBody: await req.text(),
    });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }

  const where: Prisma.LinkWhereInput = {
    projectId: "cm05wnnpo000711ztj05wwdbu",
    archived: false,
    folderId: "fold_LIZsdjTgFVbQVGYSUmYAi5vT",
    createdAt: {
      lte: new Date("2025-02-27T00:00:00.000Z"),
    },
  };

  const links = await prisma.link.findMany({
    where,
    select: {
      id: true,
      key: true,
      createdAt: true,
    },
    take: 1000,
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!links.length) {
    console.log("No more links to delete.");
    return NextResponse.json({
      status: "No more links to delete.",
    });
  }

  await prisma.link.deleteMany({
    where: {
      id: {
        in: links.map((link) => link.id),
      },
    },
  });

  console.log(`Deleted ${links.length} links`);
  const finalDeletedLink = links[links.length - 1];
  console.log(
    `Final deleted link: ${finalDeletedLink.key} (${new Date(finalDeletedLink.createdAt).toISOString()})`,
  );

  // await qstash.publishJSON({
  //   url: `${APP_DOMAIN_WITH_NGROK}/api/cron/migrate`,
  //   method: "POST",
  //   body: {},
  // });

  return NextResponse.json({
    status: `Deleted ${links.length} links. Final deleted link: ${finalDeletedLink.key} (${new Date(finalDeletedLink.createdAt).toISOString()})`,
  });
}
