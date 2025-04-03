import { FC } from "react";

export const QrTabsTitle: FC = () => {
  return (
    <h1 className="text-neutral text-center text-[28px] font-bold leading-[120%] md:text-[32px]">
      The Ultimate{" "}
      <span className="bg-qr-gradient inline-block bg-clip-text text-transparent">
        QR Solution
      </span>{" "}
      for Your Needs
    </h1>
  );
};
