import { DubApiError } from "../errors";
import { WorkspaceWithUsers } from "@/lib/types";

export const getDefaultProgramIdOrThrow = (
  workspace: WorkspaceWithUsers | { defaultProgramId?: string | null },
) => {
  const programId = (
    workspace as { defaultProgramId?: string | null }
  ).defaultProgramId;

  if (!programId) {
    throw new DubApiError({
      code: "not_found",
      message: "Program not found",
    });
  }

  return programId;
};
