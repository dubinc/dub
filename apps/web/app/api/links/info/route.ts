import { withAuth } from "@/lib/auth";
import { handleAndReturnErrorResponse } from "@/lib/errors";
import prisma from "@/lib/prisma";
import { getLinkInfoQuerySchema } from "@/lib/zod/schemas/links";
import { linkConstructor } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/links/info – get the info for a link
export const GET = withAuth(async ({ headers, searchParams }) => {
  try {
    const { domain, key } = getLinkInfoQuerySchema.parse(searchParams);

    const response = await prisma.link.findUniqueOrThrow({
      where: {
        domain_key: {
          domain,
          key,
        },
      },
      include: {
        user: true,
      },
    });

    return NextResponse.json(
      {
        ...response,
        shortLink: linkConstructor({
          domain: response.domain,
          key: response.key,
        }),
      },
      {
        headers,
      },
    );
  } catch (err) {
    return handleAndReturnErrorResponse(err, headers);
  }
});
