"use client";

import { ReactNode } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Drawer } from "vaul";
import { useMediaQuery } from "lib";

export function Tooltip({
  children,
  content,
  fullWidth,
}: {
  children: ReactNode;
  content: ReactNode | string;
  fullWidth?: boolean;
}) {
  const { isMobile } = useMediaQuery();

  if (isMobile) {
    return (
      <Drawer.Root>
        <Drawer.Trigger
          className={`${fullWidth ? "w-full" : "inline-flex"} md:hidden`}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {children}
        </Drawer.Trigger>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-gray-100 bg-opacity-10 backdrop-blur" />
        <Drawer.Portal>
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mt-24 rounded-t-[10px] border-t border-gray-200 bg-white">
            <div className="sticky top-0 z-20 flex w-full items-center justify-center rounded-t-[10px] bg-inherit">
              <div className="my-3 h-1 w-12 rounded-full bg-gray-300" />
            </div>
            <div className="flex min-h-[150px] w-full items-center justify-center overflow-hidden bg-white align-middle shadow-xl">
              {typeof content === "string" ? (
                <span className="block text-center text-sm text-gray-700">
                  {content}
                </span>
              ) : (
                content
              )}
            </div>
          </Drawer.Content>
          <Drawer.Overlay />
        </Drawer.Portal>
      </Drawer.Root>
    );
  }
  return (
    <TooltipPrimitive.Provider delayDuration={0}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger className="md:inline-flex" asChild>
          {children}
        </TooltipPrimitive.Trigger>
        {/* 
            We don't use TooltipPrimitive.Portal here because for some reason it 
            prevents you from selecting the contents of a tooltip when used inside a modal 
        */}
        <TooltipPrimitive.Content
          sideOffset={8}
          side="top"
          className="animate-slide-up-fade z-[99] items-center overflow-hidden rounded-md border border-gray-200 bg-white shadow-md md:block"
        >
          {typeof content === "string" ? (
            <div className="block max-w-xs px-4 py-2 text-center text-sm text-gray-700">
              {content}
            </div>
          ) : (
            content
          )}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
