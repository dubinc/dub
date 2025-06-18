import { cn } from "@dub/utils";
import { PropsWithChildren, ReactNode } from "react";
import { ButtonLink } from "../../placeholders/button-link";
import { ProgramOverviewCard } from "./program-overview-card";

export function ProgramOverviewBlock({
  title,
  viewAllHref,
  contentClassName,
  children,
}: PropsWithChildren<{
  title: ReactNode;
  viewAllHref?: string;
  contentClassName?: string;
}>) {
  return (
    <ProgramOverviewCard className="flex h-full flex-col py-6">
      <div className="flex justify-between px-6">
        <h2 className="text-content-emphasis text-sm font-medium">{title}</h2>
        {viewAllHref && (
          <ButtonLink
            href={viewAllHref}
            variant="secondary"
            className="-mr-1 -mt-1 h-7 px-2 text-sm"
          >
            View all
          </ButtonLink>
        )}
      </div>
      <div className={cn("mt-4 grow px-6", contentClassName)}>{children}</div>
    </ProgramOverviewCard>
  );
}
