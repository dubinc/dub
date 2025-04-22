import { useMediaQuery } from "@dub/ui";
import { Button, Text } from "@radix-ui/themes";
import { FC } from "react";
import { Rating } from "./components/rating.tsx";

interface IRatingInfoSection {
  scrollToQRGenerationBlock: () => void;
}

export const RatingInfoSection: FC<IRatingInfoSection> = ({
  scrollToQRGenerationBlock,
}) => {
  const { isMobile } = useMediaQuery();

  if (isMobile) return null;

  return (
    <section className="bg-primary-100 mx-auto flex w-full max-w-[1172px] flex-row items-center justify-between gap-[42px] px-3 py-[42px]">
      <Rating alignItems={"start"} />
      <Button
        variant="solid"
        size="3"
        color="blue"
        onClick={scrollToQRGenerationBlock}
      >
        Create Your QR Code
      </Button>
      <Text size="3" className="text-neutral-200">
        No credit card is required during registration.
      </Text>
    </section>
  );
};
