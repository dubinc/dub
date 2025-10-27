import { Badge, Button } from "@dub/ui";
import { Check } from "@dub/ui/icons";
import { cn } from "@dub/utils/src";
import { Card, Flex, Heading, Text } from "@radix-ui/themes";
import { FC } from "react";
import { PricingPlan } from "../config";

interface IPricingPlanCardProps {
  plan: PricingPlan;
  handleScrollButtonClick: (type: "1" | "2") => void;
}
export const PricingPlanCard: FC<IPricingPlanCardProps> = ({
  plan: { badge, title, plan, planFeatures, withButton },
  handleScrollButtonClick,
}) => {
  return (
    <Card
      className={cn(
        "border-border-100 relative flex min-w-[260px] shrink-0 flex-col items-stretch justify-between gap-4 border p-3 lg:gap-6",
        withButton && "!border-primary !bg-primary-100",
      )}
    >
      <Flex direction="column" align="start" justify="start" gap="3">
        <Flex
          direction="row"
          align="center"
          justify="between"
          className="w-full"
          gap="2"
        >
          <Heading as="h3" size="4" weight="bold" className="text-neutral">
            {title}
          </Heading>
          <Badge
            className={cn(
              "bg-primary-100 text-primary min-w-[100px] items-center justify-center px-2.5 py-1.5 text-center text-sm font-semibold",
              withButton && "bg-primary border-primary text-white",
            )}
          >
            {badge}
          </Badge>
        </Flex>
        <Text
          size={{ initial: "6", md: "7" }}
          weight="bold"
          className="text-neutral"
        >
          {plan}
        </Text>
        <ul className="flex flex-col gap-2">
          {planFeatures.map((feature, idx) => (
            <li key={idx} className="flex items-center gap-2">
              <Check className="text-primary h-4 w-4" />
              <Text size="3" className="text-neutral-300">
                {feature}
              </Text>
            </li>
          ))}
        </ul>
      </Flex>
      {withButton && (
        <Button
          text="Start Trial"
          className="mt-4"
          onClick={() => handleScrollButtonClick("2")}
        />
      )}
    </Card>
  );
};
