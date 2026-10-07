import { createDemoCommission } from "@/lib/api/demo/create-demo-commission";
import { assertDemoLink, verifyDemoSecret } from "@/lib/api/demo/guard";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withAxiom } from "@/lib/axiom/server";
import { getLinkWithPartner } from "@/lib/planetscale/get-link-with-partner";
import { centsSchema, parseDateSchema } from "@/lib/zod/schemas/utils";
import { COUNTRY_CODES, getDomainWithoutWWW } from "@dub/utils";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const demoCommissionSchema = z
  .object({
    domain: z.preprocess(
      (val) => getDomainWithoutWWW(val as string),
      z.string({ error: "domain is required." }),
    ),
    key: z.string({ error: "key is required." }),
    date: parseDateSchema,
    type: z.enum(["lead", "sale"]),
    country: z.enum(COUNTRY_CODES),
    region: z.string().nullish(),
    city: z.string().nullish(),
    continent: z.string().nullish(),
    referrer: z.string().nullish(),
    userAgent: z.string().nullish(),
    customer: z.object({
      name: z.string().nullish(),
      email: z.string().nullish(),
      externalId: z.string(),
      country: z.enum(COUNTRY_CODES),
    }),
    sale: z
      .object({
        amount: centsSchema.pipe(z.number().int().min(0)),
        invoiceId: z.string().nullish(),
        eventName: z.string().nullish(),
      })
      .nullish(),
  })
  .refine((data) => data.type !== "sale" || data.sale?.amount != null, {
    message: "sale.amount is required when type is sale.",
    path: ["sale", "amount"],
  });

// POST /api/demo/commission – backdated click + lead/sale + commission for the LoopWork demo only
export const POST = withAxiom(async (req) => {
  try {
    verifyDemoSecret(req);

    const body = demoCommissionSchema.parse(await parseRequestBody(req));
    const { domain, key, date, ...rest } = body;

    const link = await getLinkWithPartner({ domain, key });

    if (!link) {
      throw new DubApiError({
        code: "not_found",
        message: `Link not found for domain: ${domain} and key: ${key}.`,
      });
    }

    assertDemoLink(link);

    if (!date) {
      throw new DubApiError({
        code: "bad_request",
        message: "Invalid date.",
      });
    }

    const result = await createDemoCommission({
      link,
      date,
      ...rest,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
});
