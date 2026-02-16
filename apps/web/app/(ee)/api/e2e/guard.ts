import { DubApiError } from "@/lib/api/errors";
import { WorkspaceProps } from "@/lib/types";

export function assertE2EWorkspace(
  workspace: Pick<WorkspaceProps, "slug">,
): void {
  if (workspace.slug !== "acme") {
    throw new DubApiError({
      code: "forbidden",
      message: "E2E endpoints are restricted to the Acme test workspace.",
    });
  }
}
