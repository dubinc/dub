"use client";

import { cn } from "@dub/utils";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@dub/ui";
import { ChevronDown } from "lucide-react";
import * as React from "react";

// Program drawer specific accordion that completely overrides base styles
const ProgramDrawerAccordion = React.forwardRef<
  React.ElementRef<typeof Accordion>,
  React.ComponentPropsWithoutRef<typeof Accordion>
>((props, ref) => (
  <Accordion ref={ref} {...props} />
));
ProgramDrawerAccordion.displayName = "ProgramDrawerAccordion";

const ProgramDrawerAccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionItem>,
  React.ComponentPropsWithoutRef<typeof AccordionItem>
>(({ className, ...props }, ref) => (
  <div
    className={cn(
      // Completely custom card styling - not extending AccordionItem
      "border border-neutral-200 rounded-lg mb-3 bg-white overflow-hidden last:mb-0",
      className,
    )}
  >
    <AccordionItem
      ref={ref}
      className="border-none py-0 m-0"
      {...props}
    />
  </div>
));
ProgramDrawerAccordionItem.displayName = "ProgramDrawerAccordionItem";

const ProgramDrawerAccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionTrigger>,
  React.ComponentPropsWithoutRef<typeof AccordionTrigger> & {
    children: React.ReactNode;
  }
>(({ className, children, ...props }, ref) => (
  <AccordionTrigger
    ref={ref}
    className={cn(
      // Completely custom trigger styling - force small text on all screen sizes
      "px-4 py-3 text-sm sm:text-sm font-semibold text-neutral-800 bg-neutral-50 hover:bg-neutral-100 border-b border-neutral-200 data-[state=closed]:border-b-0 transition-all [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-neutral-400",
      className,
    )}
    variant="chevron"
    {...props}
  >
    {children}
  </AccordionTrigger>
));
ProgramDrawerAccordionTrigger.displayName = "ProgramDrawerAccordionTrigger";

const ProgramDrawerAccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionContent>,
  React.ComponentPropsWithoutRef<typeof AccordionContent>
>(({ className, children, ...props }, ref) => (
  <AccordionContent
    ref={ref}
    className={cn(
      // Override default chunky animations with smooth transitions
      "px-4 py-4 bg-white overflow-hidden transition-all duration-500 ease-in-out data-[state=closed]:animate-none data-[state=open]:animate-none",
      className,
    )}
    {...props}
  >
    {children}
  </AccordionContent>
));
ProgramDrawerAccordionContent.displayName = "ProgramDrawerAccordionContent";

export { ProgramDrawerAccordion, ProgramDrawerAccordionContent, ProgramDrawerAccordionItem, ProgramDrawerAccordionTrigger }; 