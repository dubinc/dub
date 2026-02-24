"use client";

import { DubProductIcon } from "@dub/ui";
import { capitalize } from "@dub/utils";
import { LaterButton } from "../../later-button";
import { useOnboardingProduct } from "../../use-onboarding-product";
import { StepPage } from "../step-page";
import { EnterpriseLink } from "./enterprise-link";
import { FreePlanButton } from "./free-plan-button";
import { PlanSelector } from "./plan-selector";

export default function Plan() {
  const product = useOnboardingProduct();

  return (
    <StepPage
      title={
        <>
          Choose your{" "}
          <a
            href={`https://dub.co/${product}`}
            target="_blank"
            className="group inline-block"
          >
            <DubProductIcon
              product={product}
              className="mb-[3px] ml-1 inline-flex size-5 align-middle transition-transform group-hover:-rotate-12"
              iconClassName="size-3"
            />{" "}
            Dub {capitalize(product)}
          </a>{" "}
          plan
        </>
      }
      description={
        product === "partners" ? (
          <span className="inline-block">
            Find a plan that fits your needs.
          </span>
        ) : (
          <>
            <span className="inline-block">
              Find a plan that fits your needs, or
            </span>{" "}
            <FreePlanButton className="text-base underline decoration-dotted underline-offset-2">
              start on the free plan.
            </FreePlanButton>
          </>
        )
      }
      className="max-w-screen-lg"
    >
      <PlanSelector key={product} product={product} />
      <div className="mx-auto mt-8 flex w-fit flex-col items-center justify-center gap-6 text-sm md:flex-row">
        <EnterpriseLink />
        {product === "links" && (
          <LaterButton
            next="success"
            className="underline-offset-4 hover:underline"
          >
            Start for free, pick a plan later
          </LaterButton>
        )}
        <a
          href={`https://dub.co/pricing/${product}`}
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
