"use client";

import { SectionTitle } from "@/ui/landing/components/section-title.tsx";
import { BlockMarkdown } from "@/ui/partners/lander-blocks/BlockMarkdown.tsx";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  useMediaQuery,
} from "@dub/ui";
import { Heading } from "@radix-ui/themes";
import { FC } from "react";

type FaqItems = {
  title: string;
  content: string;
};

interface IFaqSectionProps {
  faqItems: FaqItems[];
}

export const FAQSection: FC<IFaqSectionProps> = ({ faqItems }) => {
  const { isMobile } = useMediaQuery();

  return (
    <section className="mx-auto flex w-full max-w-[1172px] flex-col items-center justify-between gap-2 px-3 pt-3 lg:flex-row lg:items-start lg:gap-6 lg:pt-8">
      <SectionTitle
        titleFirstPart={isMobile ? "FAQ" : "Frequently Asked Questions"}
        className="mb-4 text-center lg:max-w-64 lg:!text-left"
      />
      <Accordion type="multiple" className="w-full">
        {faqItems.map((item, idx) => (
          <AccordionItem key={idx} value={idx.toString()}>
            <AccordionTrigger className="justify-beetwen group gap-3 py-2 text-neutral-700">
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
