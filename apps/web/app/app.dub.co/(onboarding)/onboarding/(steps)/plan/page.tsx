import { LaterButton } from "../../later-button";
import { StepPage } from "../step-page";
import { PlanSelector } from "./plan-selector";

export default function Plan() {
  return (
    <StepPage
      title="Choose your plan"
      description="Find a plan that fits your needs"
      className="max-w-screen-lg"
    >
      <PlanSelector />
      <div className="mx-auto mt-8 flex w-fit justify-center gap-4">
        <a
          href="https://dub.co/enterprise"
          target="_blank"
          className="btext-center text-sm text-neutral-500 transition-colors hover:text-neutral-700"
        >
          Looking for enterprise?
        </a>
        <LaterButton next="finish">
          Start for free, pick a plan later
        </LaterButton>
      </div>
    </StepPage>
  );
}
