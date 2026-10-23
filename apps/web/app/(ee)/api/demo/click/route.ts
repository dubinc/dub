import { assertDemoLink, verifyDemoSecret } from "@/lib/api/demo/guard";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withAxiom } from "@/lib/axiom/server";
import { getLinkWithPartner } from "@/lib/planetscale/get-link-with-partner";
import { recordFakeClick } from "@/lib/tinybird/record-fake-click";
import { parseDateSchema } from "@/lib/zod/schemas/utils";
import { COUNTRY_CODES, getDomainWithoutWWW } from "@dub/utils";
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
  timestamp: parseDateSchema.nullish(),
});

// POST /api/demo/click – mint a geo-accurate click for the LoopWork demo workspace only
export const POST = withAxiom(async (req) => {
  try {
    verifyDemoSecret(req);

    const {
      domain,
      key,
      country,
      region,
      city,
      continent,
      referrer,
      userAgent,
      timestamp,
    } = demoClickSchema.parse(await parseRequestBody(req));

    const link = await getLinkWithPartner({ domain, key });

    if (!link) {
      throw new DubApiError({
        code: "not_found",
        message: `Link not found for domain: ${domain} and key: ${key}.`,
      });
    }

    assertDemoLink(link);

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
      ...(timestamp && { timestamp: timestamp.toISOString() }),
    });

    return NextResponse.json({ clickId: clickEvent.click_id });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
});
