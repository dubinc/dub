import { withAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { linkConstructor } from "@dub/utils";
import { NextResponse } from "next/server";
import { GetLinkInfoQuery } from "@/lib/zod/schemas/links";
import { ErrorResponse, handleApiError } from "@/lib/errors";

// GET /api/links/info – get the info for a link
export const GET = withAuth(async ({ headers, searchParams }) => {
  try {
    const { domain, key } = GetLinkInfoQuery.parse(searchParams);

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
    const { error, status } = handleApiError(err);
    return NextResponse.json<ErrorResponse>({ error }, { headers, status });
  }
});
