import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { destinationUrlChecks } from "@/lib/api/links/utils";
import { domainDestinationUrlSchema } from "@/lib/zod/schemas/links";
import { getSearchParams } from "@dub/utils";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// GET /api/links/verify/destination-url – run checks on the destination url
export const GET = async (req: NextRequest) => {
  try {
    const searchParams = getSearchParams(req.url);

    let { domain, url } = domainDestinationUrlSchema.parse(searchParams);

    const response = await destinationUrlChecks({
      domain,
      url,
    });

    if (response.error) {
      throw new DubApiError({
        code: "unprocessable_entity",
        message: response.error,
      });
    }

    return NextResponse.json(response);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
};
