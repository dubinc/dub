import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { keyChecks, processKey } from "@/lib/api/links/utils";
import { withWorkspace } from "@/lib/auth";
import { domainKeySchema } from "@/lib/zod/schemas/links";
import { getSearchParams } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/links/exists – run keyChecks on the key
export const GET = withWorkspace(async ({ req, workspace }) => {
  try {
    const searchParams = getSearchParams(req.url);

    let { domain, key } = domainKeySchema.parse(searchParams);

    const processedKey = processKey({ domain, key });
    if (processedKey === null) {
      throw new DubApiError({
        code: "unprocessable_entity",
        message: "Invalid key.",
      });
    }
    key = processedKey;

    const response = await keyChecks({
      domain,
      key,
      workspace,
    });

    if (response.error && response.code) {
      throw new DubApiError({
        code: response.code,
        message: response.error,
      });
    }

    return NextResponse.json(response);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
});
