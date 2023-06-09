import Badge from "#/ui/badge";
import { PlanProps } from "#/lib/types";

export default function PlanBadge({ plan }: { plan: PlanProps }) {
  return (
    <Badge
      text={plan}
      variant={
        plan === "enterprise" ? "purple" : plan === "pro" ? "blue" : "black"
      }
    />
  );
}
