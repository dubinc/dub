import { SectionTitle } from "@/ui/landing/components/section-title.tsx";
import { FC } from "react";

export const QrTabsDetailedTitle: FC = () => {
  return (
    <SectionTitle
      titleFirstPart={"Generate"}
      highlightedTitlePart={"QR code in seconds."}
    />
  );
};
