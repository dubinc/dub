import { FC } from "react";

export const QrTabsDetailedTitle: FC = () => {
  return (
    <h2 className="text-neutral text-center text-xl font-bold leading-[120%] md:text-[28px]">
      Generate the{" "}
      <span className="bg-qr-gradient inline-block bg-clip-text text-transparent">
        Perfect QR Code
      </span>{" "}
      for Your Needs
    </h2>
  );
};
