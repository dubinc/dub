"use client";

import { cn } from "@dub/utils";
import { ComponentProps } from "react";
import { ContentProps, Drawer } from "vaul";

function SheetRoot({
  children,
  contentProps,
  nested = false,
  ...rest
}: { contentProps?: ContentProps; nested?: boolean } & ComponentProps<
  typeof Drawer.Root
>) {
  const RootComponent = nested ? Drawer.NestedRoot : Drawer.Root;
  return (
    <RootComponent direction="right" {...rest}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/20" />
        <Drawer.Content
          {...contentProps}
          onPointerDownOutside={(e) => {
            // Don't dismiss when clicking inside a toast
            if (
              e.target instanceof Element &&
              e.target.closest("[data-sonner-toast]")
            )
              e.preventDefault();

            contentProps?.onPointerDownOutside?.(e);
          }}
          className={cn(
            "fixed bottom-2 right-2 top-2 z-10 flex w-[calc(100%-16px)] outline-none md:w-[540px]",
            contentProps?.className,
          )}
          style={
            // 8px between edge of screen and drawer
            {
              "--initial-transform": "calc(100% + 8px)",
              ...contentProps?.style,
            } as React.CSSProperties
          }
        >
          <div className="scrollbar-hide flex size-full grow flex-col overflow-y-auto rounded-lg bg-white">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </RootComponent>
  );
}

function Title({ className, ...rest }: ComponentProps<typeof Drawer.Title>) {
  return (
    <Drawer.Title
      className={cn("text-xl font-medium text-zinc-900", className)}
      {...rest}
    />
  );
}

function Description(props: ComponentProps<typeof Drawer.Description>) {
  return <Drawer.Description {...props} />;
}

function Close(props: ComponentProps<typeof Drawer.Close>) {
  return <Drawer.Close {...props} />;
}

export const Sheet = Object.assign(SheetRoot, {
  Title,
  Description,
  Close,
});
