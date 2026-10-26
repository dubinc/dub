"use client";

import { testIds } from "@/lib/e2e/test-ids";
import { DubProductIcon } from "@dub/ui";
import { LaterButton } from "../../later-button";
import { StepPage } from "../step-page";
import { EnterpriseLink } from "./enterprise-link";
import { FreePlanButton } from "./free-plan-button";
import { PlanSelector } from "./plan-selector";

export default function Plan() {
  return (
    <StepPage
      headingTestId={testIds.onboarding.stepPlan}
      title={
        <>
          Choose your{" "}
          <a
            href="https://dub.co/links"
            target="_blank"
            className="group inline-block"
          >
            <DubProductIcon
              product="links"
              className="mb-[3px] ml-1 inline-flex size-5 align-middle transition-transform group-hover:-rotate-12"
              iconClassName="size-3"
            />{" "}
            Dub Links
          </a>{" "}
          plan
        </>
      }
      description={
        <>
          <span className="inline-block">
            Find a plan that fits your needs, or
          </span>{" "}
          <FreePlanButton className="text-base underline decoration-dotted underline-offset-2">
            start on the free plan.
          </FreePlanButton>
        </>
      }
      className="max-w-screen-lg"
    >
      <PlanSelector />
      <div className="mx-auto mt-8 flex w-fit flex-col items-center justify-center gap-6 text-sm md:flex-row">
        <EnterpriseLink />
        <LaterButton
          next="success"
          className="underline-offset-4 hover:underline"
          data-testid={testIds.onboarding.freePlan}
        >
          Start for free, pick a plan later
        </LaterButton>
        <a
          href="https://dub.co/pricing/links"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center text-neutral-500 underline-offset-4 transition-colors hover:text-neutral-800 hover:underline"
        >
          Compare all plans ↗
        </a>
      </div>
    </StepPage>
  );
}
