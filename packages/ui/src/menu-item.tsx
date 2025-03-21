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

const menuItemVariants = cva(
  [
    "flex h-9 w-full rounded-md px-2 items-center justify-center gap-2 transition-colors",
    "whitespace-nowrap text-sm font-medium text-content-default hover:bg-bg-subtle transition-colors",
  ],
  {
    variants: {
      variant: {
        default: "text-content-default hover:bg-bg-subtle",
        danger: "text-content-error hover:bg-bg-error",
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
};

export function MenuItem<T extends ElementType>({
  as,
  variant = "default",
  children,
  icon: Icon,
  shortcut,
  className,
  ...rest
}: MenuItemProps<T>) {
  const Component = as || "button";

  return (
    <Component
      {...(as === "button" ? { type: "button" } : {})}
      className={cn(menuItemVariants({ variant }), className)}
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
  );
}

const isReactNode = (element: any): element is ReactNode =>
  isValidElement(element);
