import { cn } from "@dub/utils";
import { cva, type VariantProps } from "class-variance-authority";
import {
  CircleCheck,
  CircleHalfDottedClock,
  CircleInfo,
  CircleWarning,
  Icon,
} from "./icons";

const statusBadgeVariants = cva(
  "flex gap-1.5 items-center max-w-fit rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "bg-gray-500/[.15] text-gray-600",
        success: "bg-green-500/[.15] text-green-600",
        pending: "bg-orange-500/[.15] text-orange-600",
        error: "bg-red-500/[.15] text-red-600",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

const defaultIcons = {
  neutral: CircleInfo,
  success: CircleCheck,
  pending: CircleHalfDottedClock,
  error: CircleWarning,
};

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  icon?: Icon;
}

function StatusBadge({
  className,
  variant,
  icon,
  children,
  ...props
}: BadgeProps) {
  const Icon =
    icon !== null ? icon ?? defaultIcons[variant ?? "neutral"] : null;
  return (
    <span
      className={cn(statusBadgeVariants({ variant }), className)}
      {...props}
    >
      {Icon && <Icon className="h-3 w-3 shrink-0" />}
      {children}
    </span>
  );
}

export { StatusBadge, statusBadgeVariants };
