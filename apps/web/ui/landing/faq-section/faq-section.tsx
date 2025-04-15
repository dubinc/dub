"use client";

import { FAQ_ITEMS } from "@/ui/landing/faq-section/config.ts";
import { BlockMarkdown } from "@/ui/partners/lander-blocks/BlockMarkdown";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  useMediaQuery,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { Icon } from "@iconify/react";

export const FAQSection = () => {
  const { isMobile } = useMediaQuery();

  return (
    <section className="mx-auto flex max-w-[1172px] flex-col justify-between gap-2 px-3 pt-3 lg:flex-row lg:gap-6 lg:pt-8">
      <h2 className="text-neutral mb-4 text-center text-xl font-bold md:text-[28px] lg:max-w-64 lg:text-left">
        {isMobile ? "FAQ" : "Frequently Asked Questions"}
      </h2>
      <Accordion type="multiple" className="w-full">
        {FAQ_ITEMS.map((item, idx) => (
          <AccordionItem key={idx} value={idx.toString()}>
            <AccordionTrigger className="group py-2 text-neutral-700 [&>svg:last-child]:hidden">
              <h3 className="text-neutral text-left text-sm font-semibold md:text-lg">
                {item.title}
              </h3>
              <Icon
                icon={"line-md:chevron-down"}
                className={cn(
                  "h-5 w-5 transition-transform duration-200 md:h-6 md:w-6",
                  "group-data-[state=open]:rotate-180 md:group-data-[state=open]:rotate-0",
                  "group-data-[state=closed]:rotate-90",
                )}
              />
            </AccordionTrigger>
            <AccordionContent>
              <BlockMarkdown className="py-2 text-left text-xs text-neutral-300 lg:text-base">
                {item.content}
              </BlockMarkdown>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
};
