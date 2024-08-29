import { Globe } from "@dub/ui/src/icons";
import { StepPage } from "../../step-page";
import { Form } from "./form";

export default function Custom() {
  return (
    <StepPage
      icon={Globe}
      title="Connect a custom domain"
      description={
        <a
          href="https://dub.co/help/article/choosing-a-custom-domaine"
          target="_blank"
          className="underline transition-colors hover:text-gray-700"
        >
          Read our guide for best practices
        </a>
      }
    >
      <Form />
    </StepPage>
  );
}
