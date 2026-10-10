import { Badge, Tooltip } from "@dub/ui";
import { WorkspaceEnvironment } from "@prisma/client";
import { isProductionEnvironment, isStagingEnvironment } from "../environment";

export function TestPayoutBadge({
  environment,
}: {
  environment: WorkspaceEnvironment;
}) {
  if (isProductionEnvironment(environment)) {
    return null;
  }

  return (
    <Tooltip content="This is a test payout. No real money was sent.">
      <Badge
        variant={isStagingEnvironment(environment) ? "amber" : "blueGradient"}
        className="cursor-help"
      >
        Test
      </Badge>
    </Tooltip>
  );
}
