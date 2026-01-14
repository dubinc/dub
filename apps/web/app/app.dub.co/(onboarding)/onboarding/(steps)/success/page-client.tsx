"use client";

import { WorkspaceProps } from "@/lib/types";
import { Button } from "@dub/ui";
import { cn } from "@dub/utils";
import { useOnboardingProgress } from "../../use-onboarding-progress";

export function SuccessPageClient({
  workspace,
}: {
  workspace: Pick<WorkspaceProps, "name" | "defaultProgramId">;
}) {
  const { finish } = useOnboardingProgress();

  const hasProgram = Boolean(workspace.defaultProgramId);

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-sm flex-col items-center",
        "animate-slide-up-fade [--offset:10px] [animation-duration:1s] [animation-fill-mode:both]",
      )}
    >
      <h1 className="text-pretty text-center text-xl font-semibold">
        The {workspace.name} workspace has been created
      </h1>
      <p className="mt-2 text-pretty text-center text-base text-neutral-500">
        {hasProgram
          ? "Now you can manage your partner program and short links in one place"
          : "Now you have one central, organized place to build and manage all your short links."}
      </p>
      <div className="mt-4 w-full">
        <Button
          onClick={() => finish({ hasProgram })}
          text="Go to your dashboard"
          className="h-9 rounded-lg"
        />
      </div>
    </div>
  );
}
