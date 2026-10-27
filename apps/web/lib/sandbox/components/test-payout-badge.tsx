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
    <Tooltip
      content={`This is a test payout sent from a ${environment} program. No real money was sent. [Learn more](https://dub.co/docs/testing).`}
    >
      <Badge
        variant={isStagingEnvironment(environment) ? "amber" : "blueGradient"}
        className="cursor-help"
      >
        Test
      </Badge>
    </Tooltip>
  );
}
