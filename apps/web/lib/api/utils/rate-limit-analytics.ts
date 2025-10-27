import { Session } from "@/lib/auth/utils";
import { WorkspaceProps } from "@/lib/types";
import { ratelimit } from "@/lib/upstash";
import { getCurrentPlan } from "@dub/utils";
import { NextResponse } from "next/server";
import { ErrorResponse } from "../errors";

export const rateLimitAnalytics = async ({
  workspace,
  session,
}: {
  workspace: Pick<WorkspaceProps, "id" | "plan">;
  session: Session;
}) => {
  const planLimits = getCurrentPlan(workspace.plan).limits;

  if (!planLimits.analyticsApi) {
    return;
  }

  const { success, limit, reset, remaining } = await ratelimit(
    planLimits.analyticsApi,
    "1 s",
  ).limit(`analytics:${workspace.id}:${session.user.id}`);

  if (!success) {
    return NextResponse.json<ErrorResponse>(
      {
        error: {
          code: "rate_limit_exceeded",
          message: "Too many requests.",
        },
      },
      {
        headers: {
          "Retry-After": reset.toString(),
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        },
      },
    );
  }
};
