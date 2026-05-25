import { BoltFill } from "@dub/ui";
import { StepPage } from "../../step-page";
import { Form } from "./form";

export default function Subdomain() {
  return (
    <StepPage
      title="Claim your free .dub.link subdomain"
      description="Set up your branded short-link domain in one click."
      badge={{
        icon: BoltFill,
        label: "Instant setup",
      }}
    >
      <Form />
    </StepPage>
  );
}
