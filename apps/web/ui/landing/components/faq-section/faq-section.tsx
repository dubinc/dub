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
import { cn } from "@dub/utils/src";
import { Heading } from "@radix-ui/themes";
import { FC, useEffect, useRef, useState } from "react";

type FaqItems = {
  title: string;
  content: string | string[];
};

interface IFaqSectionProps {
  faqItems: FaqItems[];
  homePageDemo?: boolean;
}

export const FAQSection: FC<IFaqSectionProps> = ({
  faqItems,
  homePageDemo = true,
}) => {
  const { isMobile } = useMediaQuery();
  const [openItems, setOpenItems] = useState<string[]>([]);
  const contentRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Scroll to the opened item on mobile
  useEffect(() => {
    openItems.forEach((itemIndex) => {
      const idx = parseInt(itemIndex, 10);
      const contentRef = contentRefs.current[idx];

      if (contentRef) {
        setTimeout(() => {
          if (contentRef) {
            const rect = contentRef.getBoundingClientRect();
            const isInView = rect.top >= 0 && rect.bottom <= window.innerHeight;

            if (!isInView && rect.height > 50) {
              contentRef.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
              });
            }
          }
        }, 400);
      }
    });
  }, [openItems]);

  return (
    <section className="mx-auto flex w-full max-w-[1172px] flex-col items-center justify-between gap-2 px-3 pt-3 lg:flex-row lg:items-start lg:gap-6 lg:pt-8">
      <SectionTitle
        titleFirstPart={isMobile ? "FAQ" : "Frequently Asked Questions"}
        className={cn("mb-4 text-center lg:max-w-64 lg:!text-left", {
          "!text-2xl lg:!text-[30px] lg:!leading-8": !homePageDemo,
        })}
      />
      <Accordion
        type="multiple"
        className="w-full"
        value={openItems}
        onValueChange={setOpenItems}
      >
        {faqItems.map((item, idx) => (
          <AccordionItem
            key={idx}
            value={idx.toString()}
            className={cn("", {
              "first:pt-0": !homePageDemo,
            })}
          >
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
            <AccordionContent
              ref={(el) => {
                contentRefs.current[idx] = el;
              }}
            >
              {Array.isArray(item.content) ? item.content.map((content) => (
                <BlockMarkdown key={content} className="py-2 text-left text-base text-neutral-300">
                  {content}
                </BlockMarkdown>
              )) : (
                <BlockMarkdown className="py-2 text-left text-base text-neutral-300">
                  {item.content}
                </BlockMarkdown>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
};
