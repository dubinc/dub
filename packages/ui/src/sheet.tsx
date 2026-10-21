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
  // On mobile, nested sheets match the z-50 of Modal's Drawer and Popover's
  // Drawer, so layers that share a z-index stack in the order they open.
  const zIndexClassName = nested ? "z-40 max-sm:z-50" : "z-40";
  return (
    <RootComponent direction="right" handleOnly {...rest}>
      <Drawer.Portal>
        <Drawer.Overlay
          className={cn("fixed inset-0 bg-black/20", zIndexClassName)}
          data-sheet-overlay
        />
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
            "@container/sheet fixed bottom-2 right-2 top-2 flex outline-none",
            zIndexClassName,
            "w-[min(var(--sheet-width),calc(100%-2*var(--sheet-margin)))] [--sheet-margin:8px] [--sheet-width:540px]",
            contentProps?.className,
          )}
          style={
            // 8px between edge of screen and drawer
            {
              "--initial-transform": "calc(100% + 8px)",
              userSelect: "auto", // Override default user-select: none from Vaul
              ...contentProps?.style,
            } as React.CSSProperties
          }
        >
          <div className="scrollbar-hide flex size-full grow flex-col overflow-y-auto rounded-xl bg-white">
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
      className={cn("text-lg font-semibold text-neutral-900", className)}
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
