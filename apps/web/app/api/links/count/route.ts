import { getLinksCount } from "@/lib/api/links";
import { withAuth } from "@/lib/auth";
import { handleAndReturnErrorResponse } from "@/lib/errors";
import { getLinksCountParamsSchema } from "@/lib/zod/schemas/links";
import { NextResponse } from "next/server";

// GET /api/links/count – get the number of links for a project
export const GET = withAuth(async ({ headers, searchParams, project }) => {
  try {
    const { userId, ...params } = getLinksCountParamsSchema.parse(searchParams);

    const count = await getLinksCount({
      searchParams: params,
      projectId: project.id,
      userId,
    });

    return NextResponse.json(count, {
      headers,
    });
  } catch (error) {
    return handleAndReturnErrorResponse(error, headers);
  }
});
