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
        "fixed left-0 right-0 top-0 z-50 flex h-12 items-center justify-between gap-4 overflow-hidden bg-amber-200 px-4 text-neutral-900",
      )}
    >
      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <Cube className="size-4 shrink-0" />
        <span className="truncate text-sm font-semibold text-neutral-800">
          Staging workspace
        </span>
      </div>

      <p className="hidden min-w-0 flex-1 text-center text-sm font-medium text-neutral-800 sm:block">
        No real money or payouts in staging.{" "}
        <a
          href="https://dub.co/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          Learn more
        </a>
      </p>
    </div>
  );
}
