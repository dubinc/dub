import { CircleCheck, CircleInfo, TriangleWarning } from "@dub/ui";
import { cn } from "@dub/utils";
import { PropsWithChildren } from "react";

const calloutVariants = {
  success: {
    icon: CircleCheck,
    containerClassName: "border-green-200 bg-green-50 text-green-900",
    iconClassName: "text-green-600",
  },
  info: {
    icon: CircleInfo,
    containerClassName: "border-blue-200 bg-blue-50 text-blue-900",
    iconClassName: "text-blue-600",
  },
  warn: {
    icon: TriangleWarning,
    containerClassName: "border-amber-200 bg-amber-50 text-amber-900",
    iconClassName: "text-amber-600",
  },
  error: {
    icon: TriangleWarning,
    containerClassName: "border-red-200 bg-red-50 text-red-900",
    iconClassName: "text-red-600",
  },
  neutral: {
    icon: CircleInfo,
    containerClassName: "border-neutral-200 bg-neutral-50 text-neutral-900",
    iconClassName: "text-neutral-600",
  },
};

export function Callout({
  variant = "neutral",
  size = 2,
  className,
  children,
}: PropsWithChildren<{
  variant?: keyof typeof calloutVariants;
  size?: 1 | 2;
  className?: string;
}>) {
  const {
    icon: Icon,
    containerClassName,
    iconClassName,
  } = calloutVariants[variant];

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-[10px] border text-sm font-normal",
        size === 2 ? "px-4 py-3" : "px-3 py-2",
        containerClassName,
        className,
      )}
    >
      <div className="flex h-5 shrink-0 items-center">
        <Icon className={cn("size-3.5", iconClassName)} />
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
