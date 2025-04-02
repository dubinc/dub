import { cn } from "@dub/utils";
import { Link as NavigationMenuLink } from "@radix-ui/react-navigation-menu";
import Link from "next/link";
import { ComponentProps, ReactNode, SVGProps } from "react";
import { ExpandingArrow, Icon } from "../../icons";

export const contentHeadingClassName =
  "text-xs uppercase text-neutral-500 dark:text-white/60";

export const contentLinkCardClassName =
  "group rounded-[8px] p-2 transition-colors hover:bg-neutral-50 active:bg-neutral-100 dark:hover:bg-white/[0.15] dark:active:bg-white/20";

export const getUtmParams = ({
  domain,
  ...rest
}: { domain: string } & Record<string, string>) => ({
  utm_source: "Custom Domain",
  utm_medium: "Navbar",
  utm_campaign: domain,
  ...rest,
});

export function ContentLinkCard({
  icon,
  title,
  description,
  descriptionLines = 1,
  className,
  showArrow,
  ...rest
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  descriptionLines?: 1 | 2;
  showArrow?: boolean;
} & ComponentProps<typeof Link>) {
  return (
    <NavigationMenuLink asChild>
      <Link className={cn(contentLinkCardClassName, className)} {...rest}>
        <div className="flex items-center justify-between gap-3">
          {icon}
          <div className="flex-1">
            <p className="text-sm font-medium text-neutral-700 dark:text-white">
              {title}
            </p>
            {description && (
              <p
                className={cn(
                  "text-xs text-neutral-500 dark:text-white/60",
                  ["line-clamp-1", "line-clamp-2"][descriptionLines - 1],
                )}
              >
                {description}
              </p>
            )}
          </div>
          {showArrow && (
            <ExpandingArrow className="invisible -ml-6 h-4 w-4 text-neutral-700 group-aria-selected:visible sm:group-hover:visible dark:text-white/80" />
          )}
        </div>
      </Link>
    </NavigationMenuLink>
  );
}

export function ContentIcon({
  icon: Icon,
}: {
  icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
}) {
  return (
    <div className="shrink-0 rounded-[10px] border border-neutral-200 bg-white/50 p-3 dark:border-white/20 dark:bg-white/10">
      <Icon className="h-4 w-4 text-black transition-transform group-hover:scale-110 dark:text-white/80" />
    </div>
  );
}

export function ToolLinkCard({
  name,
  href,
  icon,
}: {
  name: string;
  href: string;
  icon: ReactNode;
}) {
  return (
    <NavigationMenuLink asChild>
      <Link
        href={href}
        className="group relative isolate overflow-hidden rounded-[8px] border border-neutral-100 p-3 text-sm font-medium text-neutral-800 transition-colors hover:border-neutral-200 hover:bg-neutral-100 active:bg-neutral-200 dark:border-white/20 dark:text-white/80 dark:hover:bg-white/[0.15] dark:active:bg-white/20"
      >
        <div className="absolute -bottom-5 -right-3 -z-[1] w-14">{icon}</div>
        {name}
      </Link>
    </NavigationMenuLink>
  );
}

export function LargeLinkCard({
  icon: Icon,
  title,
  description,
  iconClassName,
  ...rest
}: {
  icon: Icon;
  title: string;
  description?: string;
  iconClassName?: string;
} & ComponentProps<typeof Link>) {
  return (
    <NavigationMenuLink asChild>
      <Link
        {...rest}
        className="group relative flex flex-col justify-center rounded-xl border border-neutral-100 bg-neutral-50 transition-colors duration-150 hover:bg-neutral-100 active:bg-neutral-200 dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/15 dark:active:bg-white/20"
      >
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <span className="text-sm font-medium leading-none text-neutral-900 dark:text-white">
              {title}
            </span>
            <p className="mt-1 text-sm text-neutral-500 dark:text-white/60">
              {description}
            </p>
          </div>
          <Icon
            className={cn(
              "size-6 text-neutral-700 dark:text-neutral-200",
              iconClassName,
            )}
          />
        </div>
      </Link>
    </NavigationMenuLink>
  );
}
