import { Icon } from "@iconify/react";
import { FC } from "react";
import { FeaturesCard } from "./components/FeaturesCard.tsx";
import { GET_QR_FEATURES } from "./config.ts";

export const GetQRFeaturesCardsSection: FC = () => {
  return (
    <section className="mx-auto flex max-w-[1172px] flex-col items-center justify-center gap-4 px-3 py-6 lg:gap-[42px] lg:py-[42px]">
      <h2 className="text-neutral max-w-[200px] text-center text-xl font-bold leading-[120%] md:max-w-none md:text-[28px]">
        More Than Just a{" "}
        <span className="bg-qr-gradient inline-block bg-clip-text text-transparent">
          QR Code
        </span>{" "}
        Generator
      </h2>
      <div className="gap flex flex-col items-stretch justify-center gap-4 md:flex-row">
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
