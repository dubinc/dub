import { withAuth } from "@/lib/auth";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/errors";
import prisma from "@/lib/prisma";
import { getLinkInfoQuerySchema } from "@/lib/zod/schemas/links";
import { linkConstructor } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/links/info – get the info for a link
export const GET = withAuth(async ({ headers, searchParams }) => {
  try {
    const { domain, key } = getLinkInfoQuerySchema.parse(searchParams);

    const response = await prisma.link.findUnique({
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

    if (!response) {
      throw new DubApiError({
        code: "not_found",
        message: "Link not found.",
      });
    }

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
  } catch (error) {
    return handleAndReturnErrorResponse(error, headers);
  }
});
