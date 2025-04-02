import { LaterButton } from "../../later-button";
import { StepPage } from "../step-page";
import { FreePlanButton } from "./free-plan-button";
import { PlanSelector } from "./plan-selector";

export default function Plan() {
  return (
    <StepPage
      title="Choose your plan"
      description={
        <>
          <span className="inline-block">
            Find a plan that fits your needs, or stay on the
          </span>{" "}
          <FreePlanButton className="text-base underline underline-offset-2">
            free plan
          </FreePlanButton>
          .
        </>
      }
      className="max-w-screen-lg"
    >
      <PlanSelector />
      <div className="mx-auto mt-8 flex w-fit flex-col items-center justify-center gap-6 text-sm md:flex-row">
        <a
          href="https://dub.co/enterprise"
          target="_blank"
          className="flex items-center text-gray-500 underline-offset-4 transition-colors hover:text-gray-800 hover:underline"
        >
          Looking for enterprise? ↗
        </a>
        <LaterButton
          next="finish"
          className="underline-offset-4 hover:underline"
        >
          Start for free, pick a plan later
        </LaterButton>
        <a
          href="https://dub.co/pricing"
          target="_blank"
          className="flex items-center text-gray-500 underline-offset-4 transition-colors hover:text-gray-800 hover:underline"
        >
          Compare all plans ↗
        </a>
      </div>
    </StepPage>
  );
}
