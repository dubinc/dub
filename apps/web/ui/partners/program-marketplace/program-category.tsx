import { PROGRAM_CATEGORIES_MAP } from "@/lib/network/program-categories";
import { Category } from "@dub/prisma/client";
import { CircleInfo } from "@dub/ui";
import { cn } from "@dub/utils";

export const ProgramCategory = ({
  category,
  onClick,
  variant = "default",
  className,
}: {
  category: Category;
  onClick?: () => void;
  variant?: "default" | "pill";
  className?: string;
}) => {
  const categoryData = PROGRAM_CATEGORIES_MAP[category];
  const { icon: Icon, label } = categoryData ?? {
    icon: CircleInfo,
    label: category.replaceAll("_", " "),
  };

  const As = onClick ? "button" : "div";

  return (
    <As
      {...(onClick && {
        type: "button",
        onClick: (e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick?.();
        },
      })}
      className={cn(
        variant === "pill"
          ? "inline-flex min-w-0 items-center gap-1.5 rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-600"
          : "text-content-default -ml-1 flex h-6 min-w-0 items-center gap-1 rounded-md px-1",
        onClick &&
          (variant === "pill"
            ? "hover:bg-neutral-300/80 active:bg-neutral-300"
            : "hover:bg-bg-subtle active:bg-bg-emphasis"),
        className,
      )}
    >
      <Icon
        className={cn(
          "shrink-0",
          variant === "pill" ? "size-3.5 text-neutral-600" : "size-4",
        )}
      />
      <span
        className={cn(
          "min-w-0 truncate",
          variant === "pill" ? "font-medium" : "text-sm font-medium",
        )}
      >
        {label}
      </span>
    </As>
  );
};
