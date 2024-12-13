import { Users } from "@dub/ui/icons";
import { StepPage } from "../step-page";
import { Form } from "./form";

export default function Invite() {
  return (
    <StepPage
      icon={Users}
      title="Invite teammates"
      description="Invite teammates to join your workspace. Invitations will be valid for 14 days."
      paidPlanRequired
    >
      <Form />
    </StepPage>
  );
}
