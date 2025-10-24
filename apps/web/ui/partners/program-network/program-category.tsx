import { categoriesMap } from "@/lib/partners/categories";
import { Category } from "@dub/prisma/client";
import { CircleInfo } from "@dub/ui";
import { cn } from "@dub/utils";

export const ProgramCategory = ({
  category,
  onClick,
  className,
}: {
  category: Category;
  onClick?: () => void;
  className?: string;
}) => {
  const categoryData = categoriesMap[category];
  const { icon: Icon, label } = categoryData ?? {
    icon: CircleInfo,
    label: category.replace("_", " "),
  };

  const As = onClick ? "button" : "div";

  return (
    <As
      {...(onClick && { type: "button", onClick })}
      className={cn(
        "text-content-default flex h-6 min-w-0 items-center gap-1 rounded-md px-1",
        onClick && "hover:bg-bg-subtle active:bg-bg-emphasis",
        className,
      )}
    >
      <Icon className="size-4" />
      <span className="min-w-0 truncate text-sm font-medium">{label}</span>
    </As>
  );
};
