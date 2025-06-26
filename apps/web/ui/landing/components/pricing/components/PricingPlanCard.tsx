import { Badge, Button } from "@dub/ui";
import { Check } from "@dub/ui/icons";
import { cn } from "@dub/utils/src";
import { Card, Flex, Heading, Text } from "@radix-ui/themes";
import { FC } from "react";

interface IPricingPlanCardProps {
  badge: string;
  title: string;
  plan: string;
  planFeatures: string[];
  handleScrollButtonClick: (type: "1" | "2") => void;
}
export const PricingPlanCard: FC<IPricingPlanCardProps> = ({
  badge,
  title,
  plan,
  planFeatures,
  handleScrollButtonClick,
}) => {
  const isFree = plan === "Free";

  return (
    <Card
      className={cn(
        "border-border-100 relative flex w-full flex-col items-stretch justify-between gap-4 border p-3 lg:gap-6",
        isFree && "!border-primary !bg-primary-100",
      )}
    >
      <Flex direction="column" align="start" justify="start" gap="3">
        <Flex align="center" justify="between" className="w-full">
          <Heading as="h3" size="3" weight="bold" className="text-neutral">
            {title}
          </Heading>
          <Badge
            className={cn(
              "bg-primary-100 text-primary px-2.5 py-1.5 font-semibold",
              isFree && "bg-primary border-primary text-white",
            )}
          >
            {badge}
          </Badge>
        </Flex>
        <Text size="7" weight="bold" className="text-neutral">
          {plan}
        </Text>
        <ul className="flex flex-col gap-2">
          {planFeatures.map((feature, idx) => (
            <li key={idx} className="flex items-center gap-2">
              <Check className="text-primary h-4 w-4" />
              <Text size="2" className="text-neutral-500">
                {feature}
              </Text>
            </li>
          ))}
        </ul>
      </Flex>
      {isFree && (
        <Button
          text="Start Free"
          className="mt-4"
          onClick={() => handleScrollButtonClick("2")}
        />
      )}
    </Card>
  );
};
