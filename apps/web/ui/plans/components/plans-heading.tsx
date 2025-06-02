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
        {isTrialOver ? "Your free trial has ended" : "Upgrade your plan"}
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
          : "Upgrade your plan"}
      </Heading>
    </Flex>
  );
};
