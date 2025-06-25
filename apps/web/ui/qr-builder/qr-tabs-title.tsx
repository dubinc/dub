import { Heading } from "@radix-ui/themes";
import { FC } from "react";

export const QrTabsTitle: FC = () => {
  return (
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
  );
};
