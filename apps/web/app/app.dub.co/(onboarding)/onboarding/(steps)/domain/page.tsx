import { testIds } from "@/lib/e2e/test-ids";
import { StepPage } from "../step-page";
import { DefaultDomainSelector } from "./default-domain-selector";

export default function Domain() {
  return (
    <StepPage
      headingTestId={testIds.onboarding.stepDomain}
      title="Add a custom domain"
      description={
        <>
          Make your links stand out and{" "}
          <a
            href="https://dub.co/blog/custom-domains"
            target="_blank"
            className="cursor-help font-medium underline decoration-dotted underline-offset-2 transition-colors hover:text-neutral-700"
          >
            boost click-through rates by 30%
          </a>
        </>
      }
      className="max-w-none [&>div:first-of-type]:max-w-[640px]"
    >
      <DefaultDomainSelector />
    </StepPage>
  );
}
