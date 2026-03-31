import { cn } from "@dub/utils";
import { cva } from "class-variance-authority";
import {
  ComponentPropsWithoutRef,
  ElementType,
  isValidElement,
  PropsWithChildren,
  ReactNode,
} from "react";
import { Icon } from "./icons";
import { DynamicTooltipWrapper } from "./tooltip";

export const menuItemVariants = cva(
  [
    "flex h-9 w-full rounded-md px-2 items-center justify-center gap-2 transition-colors cursor-pointer",
    "whitespace-nowrap text-sm font-medium text-content-default transition-colors",
    "disabled:opacity-50 disabled:cursor-default",
  ],
  {
    variants: {
      variant: {
        default: "text-content-default hover:bg-bg-subtle",
        danger: "text-content-error hover:bg-red-50 dark:hover:bg-red-950/20",
      },
      disabled: {
        true: "opacity-50 cursor-default text-content-disabled hover:bg-bg-default",
      },
    },
  },
);

type MenuItemProps<T extends ElementType> = PropsWithChildren<
  ComponentPropsWithoutRef<T>
> & {
  as?: T;
} & {
  variant?: "default" | "danger";
  icon?: Icon | ReactNode;
  shortcut?: string;
  disabledTooltip?: string | ReactNode;
};

export function MenuItem<T extends ElementType>({
  as,
  variant = "default",
  children,
  icon: Icon,
  shortcut,
  className,
  disabledTooltip,
  ...rest
}: MenuItemProps<T>) {
  const Component = as || "button";

  return (
    <DynamicTooltipWrapper
      tooltipProps={{
        content: disabledTooltip,
      }}
    >
      <Component
        {...(as === "button" ? { type: "button" } : {})}
        className={cn(
          menuItemVariants({ variant, disabled: !!disabledTooltip }),
          className,
        )}
        disabled={disabledTooltip ? true : rest.disabled}
        {...rest}
      >
        <div className="flex grow items-center gap-2">
          {Icon && (isReactNode(Icon) ? Icon : <Icon className="size-4" />)}
          {children}
        </div>
        {shortcut && (
          <kbd
            className={cn(
              "bg-bg-inverted/5 group-hover:bg-bg-inverted/10 hidden rounded px-2 py-0.5 text-xs font-light transition-all duration-75 md:block",
            )}
          >
            {shortcut}
          </kbd>
        )}
      </Component>
    </DynamicTooltipWrapper>
  );
}

const isReactNode = (element: any): element is ReactNode =>
  isValidElement(element);
