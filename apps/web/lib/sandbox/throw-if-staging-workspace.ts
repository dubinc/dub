import { DubApiError } from "@/lib/api/errors";
import { Project, WorkspaceEnvironment } from "@prisma/client";

export function throwIfStagingWorkspace(
  workspace: Pick<Project, "environment">,
  options?: {
    when?: boolean;
    message?: string;
  },
) {
  const shouldCheck = options?.when ?? true;

  if (shouldCheck && workspace.environment === WorkspaceEnvironment.staging) {
    throw new DubApiError({
      code: "forbidden",
      message:
        options?.message ??
        "This action is not available in a staging workspace. Use the production workspace instead.",
    });
  }
}
