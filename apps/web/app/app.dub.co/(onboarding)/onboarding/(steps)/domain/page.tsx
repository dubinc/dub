import { StepPage } from "../step-page";
import { DefaultDomainSelector } from "./default-domain-selector";

export default function Domain() {
  return (
    <StepPage
      title="Add a custom domain"
      description="Take your links to the next level with your own branding."
      className="max-w-none"
    >
      <DefaultDomainSelector />
    </StepPage>
  );
}
