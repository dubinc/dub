import React, { ReactNode } from "react";
import { styled, keyframes } from "@stitches/react";
import { ChevronDown } from "./icons";
import * as AccordionPrimitive from "@radix-ui/react-accordion";

const slideDown = keyframes({
  from: { height: 0 },
  to: { height: "var(--radix-accordion-content-height)" },
});

const slideUp = keyframes({
  from: { height: "var(--radix-accordion-content-height)" },
  to: { height: 0 },
});

const AccordionContent = styled(AccordionPrimitive.Content, {
  '&[data-state="open"]': {
    animation: `${slideDown} 300ms cubic-bezier(0.87, 0, 0.13, 1)`,
  },
  '&[data-state="closed"]': {
    animation: `${slideUp} 300ms cubic-bezier(0.87, 0, 0.13, 1)`,
  },
});

// Your app...
export default function Accordion({
  items,
  activeTab,
  setActiveTab,
}: {
  items: { trigger: ReactNode; content: ReactNode }[];
  activeTab: number;
  setActiveTab: (index: number) => void;
}) {
  return (
    <AccordionPrimitive.Root
      type="single"
      defaultValue={activeTab.toString()}
      onValueChange={(value) => setActiveTab(Number(value))}
    >
      {items.map(({ trigger, content }, index) => (
        <AccordionPrimitive.Item
          key={index}
          value={index.toString()}
          className="overflow-hidden border-b border-gray-200 py-3 last:border-none"
        >
          <AccordionPrimitive.Header>
            <AccordionPrimitive.Trigger className="group flex w-full items-center justify-between">
              {trigger}
              <ChevronDown
                aria-hidden
                className="h-5 w-5 text-gray-600 transition-transform duration-300 ease-[cubic-bezier(0.87,0,0.13,1)] group-radix-state-open:rotate-180"
              />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionContent>{content}</AccordionContent>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  );
}
