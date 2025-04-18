import { FC, ReactNode } from "react";

interface IGetInfoCardProps {
  title: string;
  content: string;
  img: ReactNode;
  cardNumber: number;
}
export const InfoCard: FC<IGetInfoCardProps> = ({
  title,
  content,
  img,
  cardNumber,
}) => {
  return (
    <div className="border-border-100 flex flex-col items-center gap-3 rounded-lg border p-3 shadow-md md:gap-4 md:p-4">
      <div className="bg-border-100 relative flex h-[140px] w-full max-w-[342px] flex-shrink-0 justify-center overflow-hidden rounded-lg [&>img]:self-end">
        <div className="to-border-300 from-border-100 absolute bottom-0 left-1/2 h-[140px] w-[342px] -translate-x-1/2 rounded-[99px] bg-gradient-to-b opacity-50 blur-[80px]"></div>
        {img}
      </div>
      <div className="flex w-full flex-row items-center gap-2">
        <div className="relative flex h-7 w-7 items-center justify-center rounded-full md:h-8 md:w-8">
          <div
            className="absolute inset-0 -m-[2px] rounded-full"
            style={{
              background:
                "linear-gradient(90deg, #115740 20.53%, #25BD8B 37.79%)",
              padding: "2px",
            }}
          >
            <div className="text-neutral flex h-full w-full items-center justify-center rounded-full bg-white text-xs font-semibold md:text-sm">
              {cardNumber}
            </div>
          </div>
        </div>

        <h3 className="text-neutral text-base font-semibold md:text-lg">
          {title}
        </h3>
      </div>
      <p className="text-left text-sm text-neutral-300">{content}</p>
    </div>
  );
};
