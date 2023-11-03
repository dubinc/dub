import { cn } from "@dub/utils";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "max-w-fit rounded-full border px-2 py-px text-xs font-medium capitalize",
  {
    variants: {
      variant: {
        default: "border-gray-400 text-gray-500",
        violet: "border-violet-600 bg-violet-600 text-white",
        blue: "border-blue-500 bg-blue-500 text-white",
        black: "border-black bg-black text-white",
        gray: "border-gray-200 bg-gray-200 text-gray-800",
        neutral: "border-gray-400 text-gray-500",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
