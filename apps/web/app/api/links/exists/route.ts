import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { keyChecks, processKey } from "@/lib/api/links/utils";
import { getWorkspaceViaEdge } from "@/lib/planetscale";
import { domainKeySchema } from "@/lib/zod/schemas/links";
import { workspaceIdSchema } from "@/lib/zod/schemas/workspaces";
import { getSearchParams } from "@dub/utils";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// GET /api/links/exists – run keyChecks on the key
export const GET = async (req: NextRequest) => {
  try {
    const searchParams = getSearchParams(req.url);

    let { domain, key, workspaceId } = domainKeySchema
      .and(workspaceIdSchema)
      .parse(searchParams);

    const processedKey = processKey({ domain, key });
    if (processedKey === null) {
      throw new DubApiError({
        code: "unprocessable_entity",
        message: "Invalid key.",
      });
    }
    key = processedKey;

    const workspace = await getWorkspaceViaEdge(workspaceId);

    if (!workspace) {
      throw new DubApiError({
        code: "not_found",
        message: "Workspace not found.",
      });
    }

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
};
