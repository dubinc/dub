import { IsolatedCube } from "@dub/ui/icons";
import { capitalize, cn } from "@dub/utils";
import { WorkspaceEnvironment } from "@prisma/client";
import {
  isProductionEnvironment,
  isStagingEnvironment,
} from "../workspace-guards";

export function ProgramEnvironmentBanner({
  environment,
}: {
  environment: WorkspaceEnvironment;
}) {
  if (isProductionEnvironment(environment)) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed left-0 right-0 top-0 z-50 flex h-12 items-center justify-between gap-4 overflow-hidden px-6 text-neutral-800",
        isStagingEnvironment(environment) ? "bg-amber-200" : "bg-blue-200",
      )}
    >
      <div className="flex shrink-0 items-center gap-2">
        <IsolatedCube className="size-4 shrink-0" />
        <span className="truncate text-sm font-semibold">
          {capitalize(environment)}
        </span>
      </div>

      <p className="text-sm font-medium">
        No real money or payouts in {environment}
      </p>
    </div>
  );
}
