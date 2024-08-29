"use client";

import { InviteTeammatesForm } from "@/ui/workspaces/invite-teammates-form";
import { useOnboardingProgress } from "../../use-onboarding-progress";

export function Form() {
  const { continueTo } = useOnboardingProgress();

  return (
    <div>
      <InviteTeammatesForm
        onSuccess={() => {
          continueTo("plan");
        }}
      />
      <button
        type="button"
        onClick={() => continueTo("plan")}
        className="mt-4 w-full text-center text-sm text-gray-500 transition-colors hover:text-gray-700"
      >
        I'll do this later
      </button>
    </div>
  );
}
