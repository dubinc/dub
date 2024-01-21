import { qstash, receiver } from "@/lib/cron";
import prisma from "@/lib/prisma";
import {
  APP_DOMAIN_WITH_NGROK,
  GOOGLE_FAVICON_URL,
  getApexDomain,
  log,
} from "@dub/utils";

export async function POST(req: Request) {
  const body = await req.json();
  if (process.env.VERCEL === "1") {
    const isValid = await receiver.verify({
      signature: req.headers.get("Upstash-Signature") || "",
      body: JSON.stringify(body),
    });
    if (!isValid) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const { linkId, type } = body as {
    linkId: string;
    type: "create" | "edit";
  };

  const link = await prisma.link.findUnique({
    where: {
      id: linkId,
    },
  });

  if (!link) {
    return new Response("Link not found", { status: 200 });
  }

  console.log(`Received ${type} event for link ${linkId}`);

  // if the link is a dub.sh link, do some checks
  if (link.domain === "dub.sh") {
    const invalidFavicon = await fetch(
      `${GOOGLE_FAVICON_URL}${getApexDomain(link.url)}`,
    ).then((res) => !res.ok);

    if (invalidFavicon) {
      await log({
        message: `Suspicious link detected: ${link.domain}/${link.key} → ${link.url}`,
        type: "links",
        mention: true,
      });
    }
  }

  // for public links, delete after 30 mins (if not claimed)
  if (!link.userId) {
    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/delete`,
      // delete after 30 mins
      delay: 30 * 60,
      body: {
        linkId,
      },
    });
  }

  // increment links usage
  if (type === "create" && link.projectId) {
    const updatedProject = await prisma.project.update({
      where: {
        id: link.projectId,
      },
      data: {
        linksUsage: {
          increment: 1,
        },
      },
    });
    console.log({ updatedProject });
    if (updatedProject.linksUsage > updatedProject.linksLimit) {
      // send email
    }
  }

  return new Response("OK", { status: 200 });
}
