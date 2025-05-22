import { WorkspaceProps } from "@/lib/types";
import { DubApiError } from "../errors";

export const getDefaultProgramIdOrThrow = (
  workspace: Pick<WorkspaceProps, "defaultProgramId">,
) => {
  const programId = workspace.defaultProgramId;

  if (!programId) {
    throw new DubApiError({
      code: "not_found",
      message: "Program not found",
    });
  }

  return programId;
};
