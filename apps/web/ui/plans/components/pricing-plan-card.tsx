import { IPricingPlan } from "@/ui/plans/constants";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { Flex, Text } from "@radix-ui/themes";
import {
  getCalculatePriceForView,
  getPaymentPlanPrice,
  ICustomerBody,
} from "core/integration/payment/config";
import { FC } from "react";

interface IPricingPlanCardProps {
  user: ICustomerBody;
  plan: IPricingPlan;
  isSelected: boolean;
}

export const PricingPlanCard: FC<IPricingPlanCardProps> = ({
  user,
  plan,
  isSelected,
}) => {
  const { priceForView } = getPaymentPlanPrice({
    paymentPlan: plan.paymentPlan,
    user,
  });

  const monthlyPrice = getCalculatePriceForView(
    priceForView / plan.duration,
    user,
  );

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
            <Text as="span" size="2" weight="bold" className="text-neutral">
              {plan.name}
            </Text>
            {plan.savings && (
              <Flex
                align="center"
                justify="center"
                className="border-primary rounded-[60px] border bg-[rgba(0,122,255,0.04)] px-2 py-1"
              >
                <Text as="span" size="1" className="text-primary font-medium">
                  {plan.savings}
                </Text>
              </Flex>
            )}
          </Flex>
          <Text as="span" size="1" className="text-neutral-800">
            {plan.description}
          </Text>
        </Flex>

        <Flex direction="column" align="end">
          <Flex
            direction="row"
            align={{ initial: "center", lg: "end" }}
            gap="1"
          >
            <Text as="span" size="2" weight="bold" className="text-neutral">
              {monthlyPrice}
            </Text>
            <Text as="span" size="1" className="text-neutral-800">
              /month
            </Text>
          </Flex>
          {plan.prevPlan && (
            <Text as="span" size="1" className="text-neutral-800 line-through">
              {getCalculatePriceForView(
                getPaymentPlanPrice({
                  paymentPlan: plan.prevPlan,
                  user,
                }).priceForView / plan.duration,
                user,
              )}
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
              <div className="border-primary flex flex-shrink-0 items-center justify-center rounded-[60px] border bg-[rgba(0,122,255,0.04)] px-3 py-1">
                <span className="text-primary whitespace-nowrap text-sm font-medium leading-5">
                  {plan.savings}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-shrink-0 flex-col items-end justify-center gap-px">
          <div className="flex flex-row items-center gap-1">
            <span className="text-neutral whitespace-nowrap text-sm font-semibold">
              {monthlyPrice}
            </span>
            <span className="whitespace-nowrap text-xs text-neutral-800">
              /month
            </span>
          </div>
          {plan.prevPlan && (
            <span className="whitespace-nowrap text-xs text-neutral-800 line-through">
              {getCalculatePriceForView(
                getPaymentPlanPrice({
                  paymentPlan: plan.prevPlan,
                  user,
                }).priceForView / plan.duration,
                user,
              )}
            </span>
          )}
        </div>
      </div>
    </label>
  );
};
