import { SectionTitle } from "@/ui/landing/components/section-title.tsx";
import Image from "next/image";
import { FC } from "react";
import GetQEInfoCardOne from "../../assets/webp/get-qr-info-card-1.webp";
import GetQEInfoCardTwo from "../../assets/webp/get-qr-info-card-2.webp";
import GetQEInfoCardThree from "../../assets/webp/get-qr-info-card-3.webp";
import { InfoCard } from "./components/InfoCard.tsx";
import { GET_QR_CARDS } from "./config.ts";

const GET_QR_CARDS_IMGS = [
  GetQEInfoCardOne,
  GetQEInfoCardTwo,
  GetQEInfoCardThree,
];

export const GetQRInfoCardsSection: FC = () => {
  return (
    <section className="py-8 sm:py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col items-center justify-center gap-6 sm:mb-16 lg:mb-24 lg:gap-10">
          <SectionTitle
            titleFirstPart={"Create Your"}
            highlightedTitlePart={"QR Code"}
            titleSecondPart={"in Three Simple Steps"}
          />
        </div>

        <div className="flex flex-col items-stretch justify-center gap-6 md:flex-row">
          {GET_QR_CARDS.map((card, idx) => (
            <InfoCard
              key={idx}
              title={card.title}
              content={card.content}
              img={
                <Image
                  className="w-full self-center"
                  height={138}
                  width={122}
                  src={GET_QR_CARDS_IMGS[idx]}
                  alt="Get QR Info Card"
                />
              }
              cardNumber={idx + 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
