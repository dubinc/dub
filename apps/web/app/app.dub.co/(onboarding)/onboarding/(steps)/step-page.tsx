import { Icon } from "@dub/ui";
import { cn } from "@dub/utils";
import { Crown } from "lucide-react";
import { PropsWithChildren, ReactNode } from "react";

export function StepPage({
  children,
  icon: Icon,
  title,
  description,
  paidPlanRequired,
  className,
}: PropsWithChildren<{
  icon?: Icon;
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
      {Icon && <StepIcon icon={Icon} />}
      {paidPlanRequired && (
        <div className="mt-6 flex items-center gap-1.5 rounded-full bg-gray-200/50 px-2.5 py-0.5 text-xs font-medium text-gray-700 shadow-inner">
          <Crown className="size-3" />
          Paid plan required
        </div>
      )}
      <h1 className="mt-4 text-center text-2xl font-medium leading-tight">
        {title}
      </h1>
      <p className="mt-1.5 text-center text-base leading-tight text-gray-500">
        {description}
      </p>
      <div className="mt-8 w-full">{children}</div>
    </div>
  );
}

function StepIcon({ icon: Icon }: { icon: Icon }) {
  return (
    <div className="rounded-full border border-gray-200 bg-white p-2.5">
      <Icon className="size-[18px]" />
    </div>
  );
}
