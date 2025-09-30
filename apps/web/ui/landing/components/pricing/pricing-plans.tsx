import { SectionTitle } from "@/ui/landing/components/section-title.tsx";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { FC } from "react";
import { PricingPlanCard } from "./components/PricingPlanCard.tsx";
import { PRICING_PLANS } from "./config.ts";

interface IPricingSectionProps {
  handleScrollButtonClick: (type: "1" | "2" | "3") => void;
}

export const PricingSection: FC<IPricingSectionProps> = ({
  handleScrollButtonClick,
}) => {
  return (
    <section className="mx-auto mb-[28px] flex max-w-[1172px] flex-col items-center justify-center gap-6 px-3 py-10 lg:mb-[24px] lg:gap-10 lg:py-14">
      <SectionTitle
        titleFirstPart={"Start Free, Upgrade when"}
        highlightedTitlePart={"You Need"}
        className="lg:!leading-[52px]"
      />
      <ScrollArea.Root type="auto" className="w-full">
        <ScrollArea.Viewport className="w-full overflow-x-scroll">
          <div className="flex flex-row items-stretch justify-between gap-4 md:gap-6">
            {PRICING_PLANS.map((plan, idx) => (
              <PricingPlanCard
                key={idx}
                plan={plan}
                handleScrollButtonClick={() => handleScrollButtonClick("3")}
              />
            ))}
          </div>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar
          orientation="horizontal"
          className="!bg-border-100 !-bottom-[3%] !h-1 rounded-[3px] border border-[#00002D17]"
        >
          <ScrollArea.Thumb className="!bg-primary !h-full rounded-lg" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </section>
  );
};
