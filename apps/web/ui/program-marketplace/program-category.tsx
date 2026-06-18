import { PROGRAM_CATEGORIES_MAP } from "@/lib/network/program-categories";
import { CircleInfo } from "@dub/ui";
import { cn } from "@dub/utils";
import { Category } from "@prisma/client";
import Link from "next/link";

export const programCategorySurfaceClassName =
  "inline-flex h-5 max-h-5 min-w-0 items-center gap-1 rounded-full bg-neutral-900/[0.06] px-2 text-xs font-medium text-neutral-900 shadow-[0_0.5px_1px_0_rgba(0,0,0,0.03)] ring-1 ring-inset ring-neutral-900/[0.05] backdrop-blur-[3px] backdrop-saturate-150 transition-[background-color,transform] duration-150 ease-out [@media(hover:hover)]:hover:bg-neutral-900/[0.09] active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 [@media(hover:none)]:hover:bg-neutral-900/[0.06]";

export const ProgramCategory = ({
  category,
  onClick,
  href,
  variant = "default",
  className,
}: {
  category: Category;
  onClick?: () => void;
  href?: string;
  variant?: "default" | "pill" | "surface";
  className?: string;
}) => {
  const categoryData = PROGRAM_CATEGORIES_MAP[category];
  const { icon: Icon, label } = categoryData ?? {
    icon: CircleInfo,
    label: category.replaceAll("_", " "),
  };

  const sharedClassName = cn(
    variant === "surface"
      ? programCategorySurfaceClassName
      : variant === "pill"
        ? "inline-flex min-w-0 items-center gap-1.5 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600"
        : "text-content-default -ml-1 flex h-6 min-w-0 items-center gap-1 rounded-md px-1",
    (href || onClick) &&
      (variant === "pill"
        ? "hover:bg-neutral-200/80 active:bg-neutral-200"
        : variant === "default"
          ? "hover:bg-bg-subtle active:bg-bg-emphasis"
          : undefined),
    className,
  );

  const content = (
    <>
      <Icon
        className={cn(
          "shrink-0",
          variant === "surface"
            ? "size-3 text-neutral-900"
            : variant === "pill"
              ? "size-3.5 text-neutral-500"
              : "size-4",
        )}
      />
      <span
        className={cn(
          "min-w-0 truncate",
          variant === "surface"
            ? "text-xs font-medium text-neutral-900"
            : variant === "pill"
              ? "font-medium"
              : "text-sm font-medium",
        )}
      >
        {label}
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={sharedClassName}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick?.();
        }}
        className={sharedClassName}
      >
        {content}
      </button>
    );
  }

  return <div className={sharedClassName}>{content}</div>;
};
