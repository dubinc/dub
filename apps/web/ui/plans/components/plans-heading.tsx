import { Flex, Heading } from "@radix-ui/themes";
import { FC } from "react";

interface IPlansHeading {
  isTrialOver: boolean;
}

export const PlansHeading: FC<IPlansHeading> = ({ isTrialOver }) => {
  return (
    <Flex gap="3" direction="column">
      <Heading
        as="h1"
        size={{ initial: "6", md: "7" }}
        align="center"
        className="text-neutral"
      >
        {isTrialOver
          ? "Your free trial has ended"
          : "Choose a plan that fits you best"}
      </Heading>
      <Heading
        as="h2"
        size={{ initial: "3", md: "4" }}
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
