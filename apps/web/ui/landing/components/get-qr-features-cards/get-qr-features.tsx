import { SectionTitle } from "@/ui/landing/components/section-title.tsx";
import { Icon } from "@iconify/react";
import { FC } from "react";
import { FeaturesCard } from "./components/FeaturesCard.tsx";
import { GET_QR_FEATURES } from "./config.ts";

export const GetQRFeaturesCardsSection: FC = () => {
  return (
    <section className="mx-auto flex max-w-[1172px] flex-col items-center justify-center gap-6 px-3 py-6 lg:gap-10 lg:py-12">
      <SectionTitle
        titleFirstPart={"More Than Just a"}
        highlightedTitlePart={"QR Code"}
        titleSecondPart={"Generator"}
      />
      <div className="gap flex flex-col items-stretch justify-center gap-4 md:flex-row md:gap-6">
        {GET_QR_FEATURES.map((card, idx) => (
          <FeaturesCard
            key={idx}
            title={card.title}
            content={card.content}
            img={<Icon icon={card.icon} />}
          />
        ))}
      </div>
    </section>
  );
};
