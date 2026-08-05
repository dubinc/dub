import { DubApiError } from "@/lib/api/errors";
import {
  isProductionEnvironment,
  isStagingEnvironment,
} from "@/lib/sandbox/environment";
import { Project } from "@prisma/client";

export { isProductionEnvironment, isStagingEnvironment };

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
        "This action is not available in a staging workspace.",
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

  if (shouldCheck && !isProductionEnvironment(workspace.environment)) {
    throw new DubApiError({
      code: "bad_request",
      message:
        options?.message ??
        "This action is only available in production workspaces.",
    });
  }
}
