import { cn } from "@dub/utils";
import { Crown } from "lucide-react";
import { PropsWithChildren, ReactNode } from "react";

export function StepPage({
  children,
  title,
  description,
  paidPlanRequired,
  className,
}: PropsWithChildren<{
  title: ReactNode;
  description: ReactNode;
  paidPlanRequired?: boolean;
  className?: string;
}>) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-sm flex-col items-center",
        "animate-slide-up-fade [--offset:10px] [animation-duration:1s] [animation-fill-mode:both]",
        className,
      )}
    >
      {paidPlanRequired && (
        <div className="mb-3 flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600">
          <Crown className="size-3" />
          Paid plan required
        </div>
      )}
      <h1 className="text-center text-xl font-semibold">{title}</h1>
      <div className="mt-2 text-balance text-center text-base text-neutral-500">
        {description}
      </div>
      <div className="mt-8 w-full">{children}</div>
    </div>
  );
}
