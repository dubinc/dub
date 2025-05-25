"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  AnimatedSizeContainer,
} from "@dub/ui";
import { cn } from "@dub/utils";
import * as React from "react";

// Program sheet specific accordion that completely overrides base styles
const ProgramSheetAccordion = React.forwardRef<
  React.ElementRef<typeof Accordion>,
  React.ComponentPropsWithoutRef<typeof Accordion>
>((props, ref) => <Accordion ref={ref} {...props} />);
ProgramSheetAccordion.displayName = "ProgramSheetAccordion";

const ProgramSheetAccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionItem>,
  React.ComponentPropsWithoutRef<typeof AccordionItem>
>(({ className, ...props }, ref) => (
  <div
    className={cn(
      // Completely custom card styling with group for state tracking
      "group mb-3 overflow-hidden rounded-lg border border-neutral-200 bg-white last:mb-0",
      className,
    )}
  >
    <AccordionItem ref={ref} className="m-0 border-none py-0" {...props} />
  </div>
));
ProgramSheetAccordionItem.displayName = "ProgramSheetAccordionItem";

const ProgramSheetAccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionTrigger>,
  React.ComponentPropsWithoutRef<typeof AccordionTrigger> & {
    children: React.ReactNode;
  }
>(({ className, children, ...props }, ref) => (
  <AccordionTrigger
    ref={ref}
    className={cn(
      // Completely custom trigger styling - force small text on all screen sizes, hide default icon
      "flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-800",
      "transition-all hover:bg-neutral-100 data-[state=closed]:border-b-0 sm:text-sm",
      "[&>svg]:size-4 [&>svg]:text-neutral-400 [&[data-state=open]>svg]:rotate-180",
      className,
    )}
    {...props}
  >
    <span>{children}</span>
  </AccordionTrigger>
));
ProgramSheetAccordionTrigger.displayName = "ProgramSheetAccordionTrigger";

const ProgramSheetAccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionContent>,
  React.ComponentPropsWithoutRef<typeof AccordionContent>
>(({ className, children, ...props }, ref) => (
  <AnimatedSizeContainer
    height
    transition={{
      type: "spring",
      stiffness: 300,
      damping: 30,
      mass: 0.8,
    }}
  >
    <AccordionContent
      ref={ref}
      className={cn(
        // Remove default animations and use framer-motion instead
        "bg-white px-4 py-4 data-[state=closed]:animate-none data-[state=open]:animate-none",
        className,
      )}
      {...props}
    >
      {children}
    </AccordionContent>
  </AnimatedSizeContainer>
));
ProgramSheetAccordionContent.displayName = "ProgramSheetAccordionContent";

export {
  ProgramSheetAccordion,
  ProgramSheetAccordionContent,
  ProgramSheetAccordionItem,
  ProgramSheetAccordionTrigger,
};
