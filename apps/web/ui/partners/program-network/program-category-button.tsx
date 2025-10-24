import { categoriesMap } from "@/lib/partners/categories";
import { Category } from "@dub/prisma/client";
import { CircleInfo, useRouterStuff } from "@dub/ui";
import { cn } from "@dub/utils";

export const ProgramCategoryButton = ({
  category,
  className,
}: {
  category: Category;
  className?: string;
}) => {
  const { queryParams } = useRouterStuff();
  const categoryData = categoriesMap[category];
  const { icon: Icon, label } = categoryData ?? {
    icon: CircleInfo,
    label: category.replace("_", " "),
  };

  return (
    <button
      type="button"
      onClick={() =>
        queryParams({
          set: {
            category,
          },
          del: "page",
        })
      }
      className={cn(
        "hover:bg-bg-subtle text-content-default active:bg-bg-emphasis flex h-6 min-w-0 items-center gap-1 rounded-md px-1",
        className,
      )}
    >
      <Icon className="size-4" />
      <span className="min-w-0 truncate text-sm font-medium">{label}</span>
    </button>
  );
};
