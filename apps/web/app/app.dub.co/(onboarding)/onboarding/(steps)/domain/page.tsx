import { StepPage } from "../step-page";
import { DefaultDomainSelector } from "./default-domain-selector";

export default function Domain() {
  return (
    <StepPage
      title="Add a custom domain"
      description={
        <>
          Brand your short links and{" "}
          <a
            href="https://dub.co/blog/custom-domains"
            target="_blank"
            className="underline transition-colors hover:text-neutral-700"
          >
            increase trust
          </a>
        </>
      }
      className="max-w-none"
    >
      <DefaultDomainSelector />
    </StepPage>
  );
}
