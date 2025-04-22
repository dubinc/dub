import { Heading } from "@radix-ui/themes";
import { FC } from "react";

export const QrTabsDetailedTitle: FC = () => {
  return (
    <Heading
      as="h2"
      weight="bold"
      size={{ initial: "6", md: "8" }}
      align="center"
      className="text-neutral"
    >
      Generate the{" "}
      <span className="bg-qr-gradient inline-block bg-clip-text text-transparent">
        Perfect QR Code
      </span>{" "}
      for Your Needs
    </Heading>
  );
};
