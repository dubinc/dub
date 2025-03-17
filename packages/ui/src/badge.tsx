import { cn } from "@dub/utils";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "max-w-fit rounded-full border px-2 py-px text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-neutral-400 text-neutral-500",
        violet: "border-violet-600 bg-violet-600 text-white",
        blue: "border-blue-500 bg-blue-500 text-white",
        green: "border-green-100 bg-green-100 text-green-900",
        sky: "border-sky-900 bg-sky-900 text-white",
        black: "border-black bg-black text-white",
        gray: "border-neutral-200 bg-neutral-100 text-neutral-800",
        neutral: "border-neutral-400 text-neutral-500",
        amber: "border-amber-800 bg-amber-800 text-white",
        blueGradient:
          "bg-gradient-to-r from-blue-100 via-blue-100/50 to-blue-100 border border-blue-200 text-blue-900",
        rainbow:
          "bg-gradient-to-r from-violet-600 to-pink-600 text-white border-transparent",
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
