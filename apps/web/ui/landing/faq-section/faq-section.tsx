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
import { Heading } from "@radix-ui/themes";

export const FAQSection = () => {
  const { isMobile } = useMediaQuery();

  return (
    <section className="mx-auto flex max-w-[1172px] flex-col justify-between gap-2 px-3 pt-3 lg:flex-row lg:gap-6 lg:pt-8">
      <Heading
        as="h2"
        weight="bold"
        size={{ initial: "7", md: "8" }}
        className="text-neutral mb-4 text-center lg:max-w-64 lg:text-left"
      >
        {isMobile ? "FAQ" : "Frequently Asked Questions"}
      </Heading>
      <Accordion type="multiple" className="w-full">
        {FAQ_ITEMS.map((item, idx) => (
          <AccordionItem key={idx} value={idx.toString()}>
            <AccordionTrigger className="group justify-start gap-3 py-2 text-neutral-700 [&>svg:last-child]:hidden">
              <Icon
                icon={"line-md:chevron-down"}
                className={cn(
                  "transition-transform duration-200",
                  "rotate-[-90deg] group-data-[state=open]:rotate-0",
                )}
              />
              <Heading
                as="h3"
                align="left"
                size="4"
                weight="medium"
                className="text-neutral"
              >
                {item.title}
              </Heading>
            </AccordionTrigger>
            <AccordionContent>
              <BlockMarkdown className="py-2 text-left text-base text-neutral-300">
                {item.content}
              </BlockMarkdown>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
};
