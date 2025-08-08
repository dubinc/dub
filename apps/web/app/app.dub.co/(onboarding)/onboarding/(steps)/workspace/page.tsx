import { StepPage } from "../step-page";
import { Form } from "./form";

export default function Workspace() {
  return (
    <StepPage
      title="Create your workspace"
      description={
        <>
          Set up a shared space to manage your links with your team.{" "}
          <a
            href="https://dub.co/help/article/what-is-a-workspace"
            target="_blank"
            className="cursor-help font-medium underline decoration-dotted underline-offset-2 transition-colors hover:text-neutral-700"
          >
            Learn more.
          </a>
        </>
      }
    >
      <Form />
    </StepPage>
  );
}
