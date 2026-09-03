import { DubApiError } from "@/lib/api/errors";
import { prefixWorkspaceId } from "@/lib/api/workspaces/workspace-id";
import { EdgeLinkProps } from "@/lib/planetscale/types";
import { DEMO_PROGRAM_ID, DEMO_WORKSPACE_ID } from "@dub/utils";

export function verifyDemoSecret(req: Request) {
  const secret = process.env.DEMO_CLICK_SECRET;
  const authorization = req.headers.get("authorization");

  if (!secret || authorization !== `Bearer ${secret}`) {
    throw new DubApiError({
      code: "unauthorized",
      message: "Invalid or missing DEMO_CLICK_SECRET.",
    });
  }
}

export function assertDemoLink(
  link: Pick<EdgeLinkProps, "projectId" | "programId"> | null,
): asserts link is NonNullable<typeof link> {
  if (!link) {
    throw new DubApiError({
      code: "not_found",
      message: "Link not found.",
    });
  }

  if (
    prefixWorkspaceId(link.projectId) !== prefixWorkspaceId(DEMO_WORKSPACE_ID)
  ) {
    throw new DubApiError({
      code: "forbidden",
      message: "This endpoint can only record events for the demo workspace.",
    });
  }

  if (link.programId && link.programId !== DEMO_PROGRAM_ID) {
    throw new DubApiError({
      code: "forbidden",
      message: "This endpoint can only record events for the demo program.",
    });
  }
}
