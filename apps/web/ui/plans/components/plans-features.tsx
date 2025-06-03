import { PLAN_FEATURES } from "@/ui/plans/constants.ts";
import { Flex, Text } from "@radix-ui/themes";
import { Check } from "lucide-react";
import { FC } from "react";

export const PlansFeatures: FC = () => {
  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      gap={{ initial: "2", lg: "3" }}
      className="bg-primary-200 rounded-lg p-3 lg:p-3.5"
    >
      {PLAN_FEATURES.map((feature, index) => (
        <Flex
          key={index}
          direction="row"
          align="center"
          className="w-full gap-1.5"
        >
          <Check className="text-primary h-[18px] w-[18px]" strokeWidth={2} />
          <Text
            as="span"
            size={{ initial: "1", lg: "2" }}
            className="text-neutral"
          >
            {feature}
          </Text>
        </Flex>
      ))}
    </Flex>
  );
};
