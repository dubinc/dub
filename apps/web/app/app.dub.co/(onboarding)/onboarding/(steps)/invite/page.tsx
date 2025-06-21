import { StepPage } from "../step-page";
import { Form } from "./form";

export default function Invite() {
  return (
    <StepPage
      title="Invite teammates"
      description="Invite teammates to join your workspace. Invitations will be valid for 14 days."
      paidPlanRequired
    >
      <Form />
    </StepPage>
  );
}
