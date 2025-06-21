import { StepPage } from "../step-page";
import { Form } from "./form";

export default function Workspace() {
  return (
    <StepPage
      title="Create your workspace"
      description={
        <a
          href="https://dub.co/help/article/what-is-a-workspace"
          target="_blank"
          className="underline transition-colors hover:text-neutral-700"
        >
          What is a workspace?
        </a>
      }
    >
      <Form />
    </StepPage>
  );
}
