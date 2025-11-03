"use client";

import { MotionPreset } from "@/components/ui/motion-preset";
import { SectionTitle } from "@/ui/landing/components/section-title.tsx";
import { FC } from "react";
import { InfoCard } from "./components/InfoCard.tsx";
import { GET_QR_CARDS } from "./config.ts";

export const GetQRInfoCardsSection: FC = () => {
  return (
    <section className="py-10 lg:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col items-center justify-center gap-3">
          <SectionTitle
            titleFirstPart={"Create QR"}
            highlightedTitlePart={"In 3"}
            titleSecondPart={"Simple Steps"}
          />
          <p className="text-muted-foreground max-w-4xl text-base md:text-lg">
            From selection to personalization — transparency at every step.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {GET_QR_CARDS.map((card, idx) => (
            <MotionPreset
              key={idx}
              fade
              blur
              slide={{ direction: "up", offset: 40 }}
              delay={0.3 + idx * 0.15}
              transition={{ duration: 0.7 }}
            >
              <InfoCard
                title={card.title}
                content={card.content}
                cardNumber={idx + 1}
                cursorText={card.cursorText}
                visualType={card.visualType}
              />
            </MotionPreset>
          ))}
        </div>
      </div>
    </section>
  );
};
