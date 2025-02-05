import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import {
  getDomainQuerySchema,
  getUrlQuerySchema,
} from "@/lib/zod/schemas/links";
import { getSearchParams, isIframeable } from "@dub/utils";
import { NextResponse } from "next/server";

export const GET = withWorkspace(async ({ req, workspace }) => {
  try {
    const { url, domain } = getUrlQuerySchema
      .and(getDomainQuerySchema)
      .parse(getSearchParams(req.url));

    const iframeable = await isIframeable({ url, requestDomain: domain });

    return NextResponse.json({ iframeable });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
});
