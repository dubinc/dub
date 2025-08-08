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
    <section className="mx-auto flex max-w-[1172px] flex-col items-center justify-between gap-6 px-3 py-10 lg:gap-10 lg:py-14">
      <SectionTitle
        titleFirstPart={"Create Your"}
        highlightedTitlePart={"QR Code"}
        titleSecondPart={"in Three Simple Steps"}
      />
      <div className="gap flex flex-col items-stretch justify-center gap-4 md:flex-row md:gap-6">
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
    </section>
  );
};
