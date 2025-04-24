import { FC } from "react";

interface IQrTabsStepTitleProps {
  title: string;
  stepNumber?: number;
  isMobile?: boolean;
}

export const QrTabsStepTitle: FC<IQrTabsStepTitleProps> = ({
  title,
  stepNumber = 1,
  isMobile = false,
}) => {
  return (
    <div className="flex flex-row items-center justify-start gap-2">
      {!isMobile && (
        <div className="relative flex h-5 w-5 items-center justify-center gap-2 rounded-full md:h-6 md:w-6">
          <div
            className="absolute inset-0 -m-[2px] rounded-full"
            style={{
              background:
                "linear-gradient(90deg, #115740 20.53%, #25BD8B 37.79%)",
              padding: "2px",
            }}
          >
            <div className="text-neutral flex h-full w-full items-center justify-center rounded-full bg-white text-xs font-semibold md:text-sm">
              {stepNumber}
            </div>
          </div>
        </div>
      )}
      <p className="text-neutral text-base font-medium">{title}</p>
    </div>
  );
};
