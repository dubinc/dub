import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { configureDNS } from "@/lib/dynadot/configure-dns";
export const dynamic = "force-dynamic";

/*
    This route is used to configure the DNS for a domain.
    It is called by QStash 3 minutes after a domain is claimed.
*/
export async function POST(req: Request) {
  try {
    const body = await req.json();
    await verifyQstashSignature(req, body);
    const { domain } = body;

    const res = await configureDNS({ domain });
    console.log("Dynadot DNS configured.", res);

    return new Response("Dynadot DNS configured.", { status: 200 });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
