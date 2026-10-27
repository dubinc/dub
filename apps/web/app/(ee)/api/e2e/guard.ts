import { DubApiError } from "@/lib/api/errors";
import { WorkspaceProps } from "@/lib/types";
import { ACME_WORKSPACE_ID } from "@dub/utils";

export function assertE2EWorkspace(
  workspace: Pick<WorkspaceProps, "id">,
): void {
  if (workspace.id !== ACME_WORKSPACE_ID) {
    throw new DubApiError({
      code: "forbidden",
      message: "E2E endpoints are restricted to the Acme test workspace.",
    });
  }
}
