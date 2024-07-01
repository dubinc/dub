import { cn } from "@dub/utils";
import Link from "next/link";
import { ComponentProps, ReactNode, SVGProps } from "react";

export const contentHeadingClassName = "text-xs uppercase text-gray-500";

export const contentLinkCardClassName =
  "group rounded-[8px] p-2 transition-colors hover:bg-gray-100 active:bg-gray-200 dark:hover:bg-white/[0.15] dark:active:bg-white/20";

export function ContentLinkCard({
  icon,
  title,
  description,
  descriptionLines = 1,
  className,
  ...rest
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  descriptionLines?: 1 | 2;
} & ComponentProps<typeof Link>) {
  return (
    <Link className={cn(contentLinkCardClassName, className)} {...rest}>
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-white">
            {title}
          </p>
          {description && (
            <p
              className={cn(
                "text-xs text-gray-500/80 dark:text-white/60",
                ["line-clamp-1", "line-clamp-2"][descriptionLines - 1],
              )}
            >
              {description}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ContentIcon({
  icon: Icon,
}: {
  icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
}) {
  return (
    <div className="shrink-0 rounded-[10px] border border-gray-200 bg-white/50 p-3">
      <Icon className="h-4 w-4 text-black transition-transform group-hover:scale-110 dark:text-white/80" />
    </div>
  );
}
