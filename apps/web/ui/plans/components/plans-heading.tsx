import { Flex, Heading, Text } from "@radix-ui/themes";
import { FC } from "react";

interface IPlansHeading {
  isTrialOver: boolean;
}

export const PlansHeading: FC<IPlansHeading> = ({ isTrialOver }) => {
  return (
    <Flex gap="3" direction="column" className="mt-[14px] lg:mt-[22px]">
      <Heading
        as="h1"
        // size={{ initial: "7", sm: "8", md: "9" }}
        // size={{ initial: "5", lg: "7" }}
        size={{ initial: "7", lg: "8" }}
        align="center"
        className="text-neutral"
      >
        {isTrialOver ? (
          <Text>
            Your free trial{" "}
            <span className="bg-qr-gradient inline-block bg-clip-text text-transparent">
              has ended
            </span>
          </Text>
        ) : (
          <Text>
            Choose a plan that{" "}
            <span className="bg-qr-gradient inline-block bg-clip-text text-transparent">
              fits you best
            </span>
          </Text>
        )}
      </Heading>
      <Heading
        as="h2"
        // size={{ initial: "2", lg: "4" }}
        size={{ initial: "3", lg: "5" }}
        align="center"
        weight="regular"
        className="text-neutral"
      >
        {isTrialOver
          ? "Your QR codes are paused - reactivate them instantly with a plan that fits your needs"
          : "Upgrade now to keep your QR codes active after the trial ends — cancel anytime"}
      </Heading>
    </Flex>
  );
};
