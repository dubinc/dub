import { deleteDomainAndLinks } from "@/lib/api/domains/delete-domain-links";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  domain: z.string(),
  workspaceId: z.string(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    await verifyQstashSignature(req, body);

    const { domain, workspaceId } = schema.parse(body);

    const domainRecord = await prisma.domain.findUnique({
      where: {
        slug: domain,
      },
    });

    if (!domainRecord) {
      return new Response(`Domain ${domain} not found. Skipping...`);
    }

    await deleteDomainAndLinks({
      domain,
      workspaceId,
    });

    return new Response("Domain deleted.");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
