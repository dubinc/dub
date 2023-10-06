import { Badge } from "ui";
import { PlanProps } from "#/lib/types";

export default function PlanBadge({ plan }: { plan: PlanProps }) {
  return (
    <Badge
      variant={
        plan === "enterprise" ? "purple" : plan === "pro" ? "blue" : "black"
      }
    >
      {plan}
    </Badge>
  );
}
