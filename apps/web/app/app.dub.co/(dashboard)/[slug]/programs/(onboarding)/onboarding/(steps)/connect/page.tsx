import { StepPage } from "../step-page";
import { Form } from "./form";

export default async function Page() {
  return (
    <StepPage title="Connecting Dub">
      <Form />
    </StepPage>
  );
}
