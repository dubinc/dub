import Image from "next/image";
import { FC } from "react";
import GetQEInfoCardOne from "../../../../../../ui/landing/assets/png/get-qr-info-card-1.png";
import GetQEInfoCardTwo from "../../../../../../ui/landing/assets/png/get-qr-info-card-2.png";
import GetQEInfoCardThree from "../../../../../../ui/landing/assets/png/get-qr-info-card-3.png";
import { InfoCard } from "./components/InfoCard.tsx";
import { GET_QR_CARDS } from "./config.ts";

const GET_QR_CARDS_IMGS = [
  GetQEInfoCardOne,
  GetQEInfoCardTwo,
  GetQEInfoCardThree,
];

export const GetQRInfoCardsSection: FC = () => {
  return (
    <section className="mx-auto flex max-w-[1172px] flex-col items-center justify-between gap-4 px-3 py-6 lg:gap-8 lg:py-[42px]">
      <h2 className="text-neutral max-w-[250px] text-center text-xl font-bold leading-[120%] md:max-w-none md:text-[28px]">
        Create your{" "}
        <span className="bg-qr-gradient inline-block bg-clip-text text-transparent">
          QR Code
        </span>{" "}
        in three simple steps
      </h2>
      <div className="gap flex flex-col items-stretch justify-center gap-4 md:flex-row md:gap-6">
        {GET_QR_CARDS.map((card, idx) => (
          <InfoCard
            key={idx}
            title={card.title}
            content={card.content}
            img={
              <Image
                className="w-full self-center md:max-h-[138px] md:max-w-[122px]"
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
