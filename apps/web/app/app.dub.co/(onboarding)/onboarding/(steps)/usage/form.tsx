"use client";

import { Button } from "@dub/ui";
import { useForm } from "react-hook-form";
import { useOnboardingProgress } from "../../use-onboarding-progress";

export function Form() {
  const { continueTo } = useOnboardingProgress();
  const {
    handleSubmit,
    formState: { isSubmitting, isSubmitSuccessful },
  } = useForm();

  return (
    <div>
      <form
        onSubmit={handleSubmit(async (data) => {
          continueTo("plan");
        })}
      >
        <Button
          type="submit"
          text="Continue"
          loading={isSubmitting || isSubmitSuccessful}
        />
      </form>
    </div>
  );
}
