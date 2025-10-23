"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SectionTitle } from "@/ui/landing/components/section-title.tsx";
import { BlockMarkdown } from "@/ui/partners/lander-blocks/BlockMarkdown.tsx";
import { FC } from "react";

type FaqItems = {
  title: string;
  content: string | string[];
};

interface IFaqSectionProps {
  faqItems: FaqItems[];
}

export const FAQSection: FC<IFaqSectionProps> = ({ faqItems }) => {
  return (
    <section className="py-10 lg:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* FAQ Header */}
        <div className="mb-12 flex flex-col items-center justify-center gap-6 sm:mb-16 lg:mb-24 lg:gap-10">
          <SectionTitle
            titleFirstPart="Frequently"
            highlightedTitlePart="Asked"
            titleSecondPart="Questions"
          />
        </div>

        <Accordion
          type="single"
          collapsible
          className="w-full"
        >
          {faqItems.map((item, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-lg">
                {item.title}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {Array.isArray(item.content) ? (
                  item.content.map((content, idx) => (
                    <BlockMarkdown
                      key={idx}
                      className="py-2 text-left text-base"
                    >
                      {content}
                    </BlockMarkdown>
                  ))
                ) : (
                  <BlockMarkdown className="py-2 text-left text-base">
                    {item.content}
                  </BlockMarkdown>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};
