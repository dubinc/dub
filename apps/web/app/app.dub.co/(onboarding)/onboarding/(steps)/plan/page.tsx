import { CircleCheck } from "@dub/ui/src/icons";
import { StepPage } from "../step-page";
import { PlanSelector } from "./plan-selector";

export default function Plan() {
  return (
    <StepPage
      icon={CircleCheck}
      title="Choose your plan"
      description="Find a plan that fits your needs"
      className="max-w-2xl"
    >
      <PlanSelector />
    </StepPage>
  );
}
