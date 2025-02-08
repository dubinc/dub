import { DubApiError } from "@/lib/api/errors";
import { ProgramProps, WorkspaceWithUsers } from "@/lib/types";
import { getProgramOrThrow } from "../api/programs/get-program-or-throw";
import { PermissionAction } from "../api/rbac/permissions";
import { Session } from "./utils";
import { withWorkspace } from "./workspace";

export interface WithProgramHandler {
  (args: {
    req: Request;
    params: Record<string, string>;
    searchParams: Record<string, string>;
    headers?: Record<string, string>;
    session: Session;
    permissions: PermissionAction[];
    workspace: WorkspaceWithUsers;
    program: ProgramProps;
  }): Promise<Response>;
}

interface WithProgramOptions {
  requiredPermissions?: PermissionAction[];
  includeDiscounts?: boolean;
}

/**
 * withProgram wraps a handler with both workspace-level and program-level
 * access control.
 *
 * It first uses withWorkspace to perform all the workspace and API key checks.
 * Then it retrieves the program (using getProgramOrThrow) based on the program
 * identifier (which should be supplied in `params.programId` or `searchParams.programId`).
 * If the program does not exist or the user does not have access, an error will be thrown.
 */
export const withProgram = (
  handler: WithProgramHandler,
  options?: WithProgramOptions,
) => {
  return withWorkspace(
    async ({
      req,
      params,
      searchParams,
      headers,
      session,
      workspace,
      permissions,
    }) => {
      const programId = params.programId || searchParams.programId;

      if (!programId) {
        throw new DubApiError({
          code: "bad_request",
          message:
            "Program ID not found. Did you forget to include a `programId` query parameter?",
        });
      }

      const program = await getProgramOrThrow(
        {
          programId,
          workspaceId: workspace.id,
        },
        {
          ...(options?.includeDiscounts && { includeDiscounts: true }),
        },
      );

      return await handler({
        req,
        params,
        searchParams,
        headers,
        session,
        permissions,
        workspace,
        program,
      });
    },

    {
      ...options,
      requiredPlan: [
        "business",
        "business extra",
        "business max",
        "business plus",
        "enterprise",
      ],
    },
  );
};
