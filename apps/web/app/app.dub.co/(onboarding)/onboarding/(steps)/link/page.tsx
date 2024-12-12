import { LinkBroken } from "@dub/ui/icons";
import { StepPage } from "../step-page";
import { Form } from "./form";

export default function Link() {
  return (
    <StepPage
      icon={LinkBroken}
      title="Create a link"
      description="Don't worry, you can edit this later."
    >
      <Form />
    </StepPage>
  );
}
