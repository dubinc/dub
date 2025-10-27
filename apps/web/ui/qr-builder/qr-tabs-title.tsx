import { Heading } from "@radix-ui/themes";
import { FC } from "react";

export const QrTabsTitle: FC = () => {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <Heading
        as="h1"
        weight="bold"
        size={{ initial: "8", md: "9" }}
        className="text-neutral text-center"
      >
        Create Your{" "}
        <span className="bg-qr-gradient inline-block bg-clip-text text-transparent">
          QR Code
        </span>
      </Heading>
      <p className="text-muted-foreground max-w-2xl text-base md:text-lg">
        You design your QR to share, we drive your scans and measure with care
      </p>
    </div>
  );
};
