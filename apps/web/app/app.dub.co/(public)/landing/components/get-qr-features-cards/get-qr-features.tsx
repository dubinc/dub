import { Icon } from "@iconify/react";
import { Heading } from "@radix-ui/themes";
import { FC } from "react";
import { FeaturesCard } from "./components/FeaturesCard.tsx";
import { GET_QR_FEATURES } from "./config.ts";

export const GetQRFeaturesCardsSection: FC = () => {
  return (
    <section className="mx-auto flex max-w-[1172px] flex-col items-center justify-center gap-4 px-3 py-6 lg:gap-[42px] lg:py-12">
      <Heading
        as="h2"
        weight="bold"
        size={{ initial: "6", md: "8" }}
        align="center"
        className="text-neutral"
      >
        More Than Just a{" "}
        <span className="bg-qr-gradient inline-block bg-clip-text text-transparent">
          QR Code
        </span>{" "}
        Generator
      </Heading>
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
