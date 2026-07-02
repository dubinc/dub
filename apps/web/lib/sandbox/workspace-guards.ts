import { DubApiError } from "@/lib/api/errors";
import { Project, WorkspaceEnvironment } from "@prisma/client";

export function assertStagingWorkspace(
  workspace: Pick<Project, "environment">,
  options?: {
    when?: boolean;
    message?: string;
  },
) {
  const shouldCheck = options?.when ?? true;

  if (shouldCheck && !isStagingEnvironment(workspace.environment)) {
    throw new DubApiError({
      code: "bad_request",
      message:
        options?.message ??
        "This action is only available in staging workspaces.",
    });
  }
}

export function assertNotStagingWorkspace(
  workspace: Pick<Project, "environment">,
  options?: {
    when?: boolean;
    message?: string;
  },
) {
  const shouldCheck = options?.when ?? true;

  if (shouldCheck && isStagingEnvironment(workspace.environment)) {
    throw new DubApiError({
      code: "bad_request",
      message:
        options?.message ??
        "This action is not available in a staging workspace. Use the production workspace instead.",
    });
  }
}

export function assertProductionWorkspace(
  workspace: Pick<Project, "environment">,
  options?: {
    when?: boolean;
    message?: string;
  },
) {
  const shouldCheck = options?.when ?? true;

  if (
    shouldCheck &&
    workspace.environment !== WorkspaceEnvironment.production
  ) {
    throw new DubApiError({
      code: "bad_request",
      message:
        options?.message ??
        "This action is only available in production workspaces.",
    });
  }
}

export function isStagingEnvironment(
  environment: WorkspaceEnvironment | null | undefined,
) {
  return Boolean(environment && environment === WorkspaceEnvironment.staging);
}
