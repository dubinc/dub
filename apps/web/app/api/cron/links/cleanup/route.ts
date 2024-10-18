import { deleteDomainAndLinks } from "@/lib/api/domains";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { cleanupLink, cleanupManyLinks } from "@/lib/cron/links-cleanup";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  workspaceId: z.string(),
  linkId: z.string().optional(),
  linkIds: z.array(z.string()).optional(),
  domain: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await verifyQstashSignature(req, body);

    const { workspaceId, linkId, domain, linkIds } = schema.parse(body);

    // A link was deleted
    if (linkId) {
      await cleanupLink({ workspaceId, linkId });
      return new Response("Ok");
    }

    // Bulk links were deleted
    if (linkIds) {
      await cleanupManyLinks({ workspaceId, linkIds });
      return new Response("Ok");
    }

    // A domain was deleted
    if (domain) {
      await deleteDomainAndLinks({ workspaceId, domain });
      return new Response("Ok");
    }

    return new Response("Ok");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
