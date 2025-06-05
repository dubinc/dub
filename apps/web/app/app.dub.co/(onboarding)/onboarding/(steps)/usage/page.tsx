import { StepPage } from "../step-page";
import { Form } from "./form";

export default function Usage() {
  return (
    <StepPage
      title="Monthly usage"
      description="We'll help recommend the best plan"
    >
      <Form />
      <div className="h-48" />
      <p className="text-center text-sm font-medium text-neutral-500">
        Need more usage?{" "}
        <a
          href="https://dub.co/contact/sales"
          target="_blank"
          className="mt-8 text-neutral-800 transition-colors hover:text-neutral-950"
        >
          Chat with us about Enterprise ↗
        </a>
      </p>
    </StepPage>
  );
}
