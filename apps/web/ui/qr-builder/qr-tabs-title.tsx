import { FC } from "react";
import { SectionTitle } from "../landing/components/section-title";

export const QrTabsTitle: FC = () => {
  return (
    <div className="mb-12 flex flex-col items-center justify-center gap-3">
      <SectionTitle
        titleFirstPart={"Create Your"}
        highlightedTitlePart={"QR Code"}
      />
      <p className="text-muted-foreground max-w-4xl text-base md:text-lg">
        Create your QR and unlock scan analytics with one platform.
      </p>
    </div>
  );
};
