"use client";

import { InviteTeammatesForm } from "@/ui/workspaces/invite-teammates-form";
import { LaterButton } from "../../later-button";
import { useOnboardingProgress } from "../../use-onboarding-progress";

export function Form() {
  const { continueTo } = useOnboardingProgress();

  return (
    <div>
      <InviteTeammatesForm
        onSuccess={() => {
          continueTo("plan");
        }}
        saveOnly
      />
      <LaterButton next="plan" className="mt-4" />
    </div>
  );
}
