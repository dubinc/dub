"use client";

import { IsolatedCube, Tooltip } from "@dub/ui";
import { cn } from "@dub/utils";
import { WorkspaceEnvironment } from "@prisma/client";
import { isSandboxEnvironment, isStagingEnvironment } from "../environment";

const INDICATORS = {
  sandbox: {
    className: "bg-blue-200",
    content:
      "This is a [sandbox workspace](https://dub.co/docs/testing). No real money or payouts are processed.",
  },
  staging: {
    className: "bg-amber-200",
    content:
      "This is a [staging workspace](https://dub.co/docs/testing). No real money or payouts are processed.",
  },
} as const;

export function WorkspaceEnvironmentIndicator({
  environment,
  className,
}: {
  environment: WorkspaceEnvironment | null | undefined;
  className?: string;
}) {
  const indicator = isSandboxEnvironment(environment)
    ? INDICATORS.sandbox
    : isStagingEnvironment(environment)
      ? INDICATORS.staging
      : null;

  if (!indicator) {
    return null;
  }

  return (
    <Tooltip content={indicator.content}>
      <span
        className={cn(
          "flex size-5 shrink-0 cursor-help items-center justify-center rounded-md",
          indicator.className,
          className,
        )}
      >
        {/* Glyph is drawn around (8, 8) inside the 18×18 viewBox, so shift it to center in the badge */}
        <IsolatedCube
          viewBox="-1 -1 18 18"
          className="size-3.5"
          aria-hidden="true"
        />
      </span>
    </Tooltip>
  );
}
