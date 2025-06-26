import { PricingPlanCard } from "@/ui/landing/components/pricing/components/PricingPlanCard.tsx";
import { SectionTitle } from "@/ui/landing/components/section-title.tsx";
import { Flex } from "@radix-ui/themes";
import { FC } from "react";
import { PRICING_PLANS } from "./config.ts";

interface IPricingSectionProps {
  handleScrollButtonClick: (type: "1" | "2") => void;
}

export const PricingSection: FC<IPricingSectionProps> = ({
  handleScrollButtonClick,
}) => {
  return (
    <section className="mx-auto flex max-w-[1172px] flex-col items-center justify-center gap-6 px-3 py-6 lg:gap-10 lg:py-12">
      <SectionTitle
        titleFirstPart={"Start free, upgrade when"}
        highlightedTitlePart={"you need more"}
        className="lg:!leading-[52px]"
      />
      <Flex
        direction={{ initial: "column", md: "row" }}
        justify="between"
        align="stretch"
        gap="4"
        className="w-full"
      >
        {PRICING_PLANS.map((card, idx) => (
          <PricingPlanCard
            key={idx}
            badge={card.badge}
            title={card.title}
            plan={card.plan}
            planFeatures={card.planFeatures}
            handleScrollButtonClick={handleScrollButtonClick}
          />
        ))}
      </Flex>
    </section>
  );
};
