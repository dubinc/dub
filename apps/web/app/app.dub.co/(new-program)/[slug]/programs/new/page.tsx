import { Form } from "./form";
import { StepPage } from "./step-page";

export default async function Page() {
  return (
    <StepPage title="Getting started">
      <Form />
    </StepPage>
  );
}
