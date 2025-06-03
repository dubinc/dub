import { IPricingPlan } from "@/ui/plans/constants";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { Flex, Text } from "@radix-ui/themes";
import { FC } from "react";

interface IPricingPlanCardProps {
  plan: IPricingPlan;
  isSelected: boolean;
}

export const PricingPlanCard: FC<IPricingPlanCardProps> = ({
  plan,
  isSelected,
}) => {
  return (
    <label
      className={`flex cursor-pointer flex-row items-center gap-3 rounded-lg border p-3 lg:gap-3.5 lg:px-6 lg:py-3.5 ${
        isSelected ? "border-secondary bg-background" : "border-border-500"
      }`}
    >
      <RadioGroup.Item
        value={plan.id}
        className="data-[state=checked]:border-secondary relative h-[18px] w-[18px] flex-shrink-0 rounded-full border-2 border-neutral-200 outline-none focus:ring-0 lg:h-[22px] lg:w-[22px]"
      >
        <RadioGroup.Indicator className="flex h-full w-full items-center justify-center">
          <div className="bg-secondary absolute bottom-[22.73%] left-[22.73%] right-[22.73%] top-[22.73%] rounded-full" />
        </RadioGroup.Indicator>
      </RadioGroup.Item>

      <div className="flex w-full flex-row items-center justify-between lg:hidden">
        <Flex direction="column">
          <Flex direction="row" align="center" gap="2">
            <Text as="span" weight="bold" className="text-neutral text-[13px]">
              {plan.name}
            </Text>
            {plan.savings && (
              <Flex
                align="center"
                justify="center"
                className="border-secondary rounded-[60px] border bg-[rgba(0,122,255,0.04)] px-2 py-1"
              >
                <Text
                  as="span"
                  className="text-secondary text-[10px] font-medium"
                >
                  {plan.savings}
                </Text>
              </Flex>
            )}
          </Flex>
          <Text as="span" className="text-[10px] text-neutral-800">
            {plan.description}
          </Text>
        </Flex>

        <Flex direction="column" align="end">
          <Flex
            direction="row"
            align={{ initial: "center", lg: "end" }}
            gap="1"
          >
            <Text as="span" weight="bold" className="text-neutral text-[13px]">
              US ${plan.price.toFixed(2)}
            </Text>
            <Text as="span" className="text-[10px] text-neutral-800 lg:text-xs">
              /month
            </Text>
          </Flex>
          {plan.originalPrice && (
            <Text
              as="span"
              className="text-[10px] text-neutral-800 line-through lg:text-xs"
            >
              ${plan.originalPrice.toFixed(2)}
            </Text>
          )}
        </Flex>
      </div>

      <div className="hidden lg:flex lg:min-w-0 lg:flex-1 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <div className="flex flex-row items-center gap-4">
          <div className="flex w-[140px] flex-shrink-0 flex-col justify-center gap-px">
            <span className="text-neutral whitespace-nowrap text-sm font-semibold">
              {plan.name}
            </span>
            <span className="whitespace-nowrap text-xs text-neutral-800">
              {plan.description}
            </span>
          </div>

          <div className="flex w-[100px] justify-center">
            {plan.savings && (
              <div className="border-secondary flex flex-shrink-0 items-center justify-center rounded-[60px] border bg-[rgba(0,122,255,0.04)] px-3 py-1">
                <span className="text-secondary whitespace-nowrap text-sm font-medium leading-5">
                  {plan.savings}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-shrink-0 flex-col items-end justify-center gap-px">
          <div className="flex flex-row items-center gap-1">
            <span className="text-neutral whitespace-nowrap text-sm font-semibold">
              US ${plan.price.toFixed(2)}
            </span>
            <span className="whitespace-nowrap text-xs text-neutral-800">
              /month
            </span>
          </div>
          {plan.originalPrice && (
            <span className="whitespace-nowrap text-xs text-neutral-800 line-through">
              ${plan.originalPrice.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </label>
  );
};
