import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { prefixWorkspaceId } from "@/lib/api/workspaces/workspace-id";
import { withAxiom } from "@/lib/axiom/server";
import { getLinkWithPartner } from "@/lib/planetscale/get-link-with-partner";
import { recordFakeClick } from "@/lib/tinybird/record-fake-click";
import {
  COUNTRY_CODES,
  DEMO_PROGRAM_ID,
  DEMO_WORKSPACE_ID,
  getDomainWithoutWWW,
} from "@dub/utils";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const demoClickSchema = z.object({
  domain: z.preprocess(
    (val) => getDomainWithoutWWW(val as string),
    z.string({ error: "domain is required." }),
  ),
  key: z.string({ error: "key is required." }),
  country: z.enum(COUNTRY_CODES),
  region: z.string().nullish(),
  city: z.string().nullish(),
  continent: z.string().nullish(),
  referrer: z.string().nullish(),
  userAgent: z.string().nullish(),
});

function verifyDemoClickSecret(req: Request) {
  const secret = process.env.DEMO_CLICK_SECRET;
  const authorization = req.headers.get("authorization");

  if (!secret || authorization !== `Bearer ${secret}`) {
    throw new DubApiError({
      code: "unauthorized",
      message: "Invalid or missing DEMO_CLICK_SECRET.",
    });
  }
}

// POST /api/demo/click – mint a geo-accurate click for the LoopWork demo workspace only
export const POST = withAxiom(async (req) => {
  try {
    verifyDemoClickSecret(req);

    const {
      domain,
      key,
      country,
      region,
      city,
      continent,
      referrer,
      userAgent,
    } = demoClickSchema.parse(await parseRequestBody(req));

    const link = await getLinkWithPartner({ domain, key });

    if (!link) {
      throw new DubApiError({
        code: "not_found",
        message: `Link not found for domain: ${domain} and key: ${key}.`,
      });
    }

    if (
      prefixWorkspaceId(link.projectId) !== prefixWorkspaceId(DEMO_WORKSPACE_ID)
    ) {
      throw new DubApiError({
        code: "forbidden",
        message: "This endpoint can only record clicks for the demo workspace.",
      });
    }

    if (link.programId && link.programId !== DEMO_PROGRAM_ID) {
      throw new DubApiError({
        code: "forbidden",
        message: "This endpoint can only record clicks for the demo program.",
      });
    }

    const clickEvent = await recordFakeClick({
      link: {
        id: link.id,
        url: link.url,
        domain: link.domain,
        key: link.key,
        projectId: link.projectId,
        programId: link.programId,
        partnerId: link.partnerId,
      },
      customer: {
        country,
        region,
        city,
        continent,
      },
      referrer,
      userAgent,
    });

    return NextResponse.json({ clickId: clickEvent.click_id });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
});
