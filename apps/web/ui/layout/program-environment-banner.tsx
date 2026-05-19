import { WorkspaceEnvironment } from "@dub/prisma/client";
import { Cube } from "@dub/ui/icons";
import { cn } from "@dub/utils";

export function ProgramEnvironmentBanner({
  environment,
}: {
  environment: WorkspaceEnvironment;
}) {
  if (environment !== WorkspaceEnvironment.staging) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed left-0 right-0 top-0 z-50 flex h-12 items-center justify-between gap-4 overflow-hidden bg-amber-200 px-6 text-neutral-800",
      )}
    >
      <div className="flex shrink-0 items-center gap-2">
        <Cube className="size-4 shrink-0" />
        <span className="truncate text-sm font-semibold">
          Staging workspace
        </span>
      </div>

      <p className="text-sm font-medium">
        No real money or payouts in staging.{" "}
      </p>
    </div>
  );
}
