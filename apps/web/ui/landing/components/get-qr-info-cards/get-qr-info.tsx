import { SectionTitle } from "@/ui/landing/components/section-title.tsx";
import Image from "next/image";
import { FC } from "react";
import GetQEInfoCardOne from "../../assets/svg/get-qr-info-card-1.svg";
import GetQEInfoCardTwo from "../../assets/svg/get-qr-info-card-2.svg";
import GetQEInfoCardThree from "../../assets/svg/get-qr-info-card-3.svg";
import { InfoCard } from "./components/InfoCard.tsx";
import { GET_QR_CARDS } from "./config.ts";

const GET_QR_CARDS_IMGS = [
  GetQEInfoCardOne,
  GetQEInfoCardTwo,
  GetQEInfoCardThree,
];

export const GetQRInfoCardsSection: FC = () => {
  return (
    <section className="mx-auto flex max-w-[1172px] flex-col items-center justify-between gap-6 px-3 py-6 lg:gap-10 lg:py-12">
      <SectionTitle
        titleFirstPart={"Create your"}
        highlightedTitlePart={"QR Code"}
        titleSecondPart={"in three simple steps"}
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
