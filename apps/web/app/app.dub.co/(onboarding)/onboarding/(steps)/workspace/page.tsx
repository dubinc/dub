import { CreateWorkspaceForm } from "@/ui/workspaces/create-workspace-form";
import { GridPlus } from "@dub/ui/src/icons";
import { StepIcon } from "../step-icon";

export default function Workspace() {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center">
      <StepIcon icon={GridPlus} />
      <h1 className="mt-4 text-lg font-medium">Create a workspace</h1>
      <CreateWorkspaceForm className="mt-8" />
    </div>
  );
}
