"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  AnimatedSizeContainer,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
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
      // Completely custom card styling - not extending AccordionItem
      "mb-3 overflow-hidden rounded-lg border border-neutral-200 bg-white last:mb-0",
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
>(({ className, children, ...props }, ref) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleRef = React.useCallback(
    (element: HTMLButtonElement | null) => {
      if (element) {
        const observer = new MutationObserver(() => {
          const state = element.getAttribute("data-state");
          setIsOpen(state === "open");
        });

        observer.observe(element, {
          attributes: true,
          attributeFilter: ["data-state"],
        });

        // Set initial state
        const initialState = element.getAttribute("data-state");
        setIsOpen(initialState === "open");

        // Store cleanup function
        (element as any)._observer = observer;
      }

      // Forward the ref
      if (typeof ref === "function") {
        ref(element);
      } else if (ref) {
        (ref as any).current = element;
      }
    },
    [ref],
  );

  return (
    <AccordionTrigger
      ref={handleRef}
      className={cn(
        // Completely custom trigger styling - force small text on all screen sizes, hide default icon
        "border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-800 transition-all hover:bg-neutral-100 data-[state=closed]:border-b-0 sm:text-sm [&>svg]:hidden",
        className,
      )}
      {...props}
    >
      <div className="flex w-full items-center justify-between">
        <span>{children}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="text-neutral-400"
          style={{ transformOrigin: "center" }}
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </div>
    </AccordionTrigger>
  );
});
ProgramSheetAccordionTrigger.displayName = "ProgramSheetAccordionTrigger";

const ProgramSheetAccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionContent>,
  React.ComponentPropsWithoutRef<typeof AccordionContent>
>(({ className, children, ...props }, ref) => (
  <AnimatedSizeContainer
    height
    transition={{ duration: 0.2, ease: "easeInOut" }}
    className="-m-1"
  >
    <div className="p-1">
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
    </div>
  </AnimatedSizeContainer>
));
ProgramSheetAccordionContent.displayName = "ProgramSheetAccordionContent";

export {
  ProgramSheetAccordion,
  ProgramSheetAccordionContent,
  ProgramSheetAccordionItem,
  ProgramSheetAccordionTrigger,
};
