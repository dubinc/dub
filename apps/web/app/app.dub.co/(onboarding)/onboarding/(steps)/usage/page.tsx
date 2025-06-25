import { StepPage } from "../step-page";
import { Form } from "./form";

export default function Usage() {
  return (
    <StepPage
      title="Monthly usage"
      description="Give us a few details about your usage and we'll help recommend the best plan"
    >
      <Form />
      <p className="mt-8 text-center text-sm font-medium text-neutral-500">
        Need more usage?{" "}
        <a
          href="https://dub.co/contact/sales"
          target="_blank"
          className="text-neutral-800 transition-colors hover:text-neutral-950"
        >
          Chat with us about Enterprise ↗
        </a>
      </p>
    </StepPage>
  );
}
