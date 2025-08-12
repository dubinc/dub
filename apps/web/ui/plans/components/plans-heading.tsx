import { FeaturesAccess } from '@/lib/actions/check-features-access-auth-less';
import { Flex, Heading, Text } from "@radix-ui/themes";
import { FC, useMemo } from "react";

interface IPlansHeading {
  featuresAccess: FeaturesAccess;
}

export const PlansHeading: FC<IPlansHeading> = ({
  featuresAccess,
}) => {
  const subHeaderText = useMemo(() => {
    switch (true) {
      case !featuresAccess.isTrialOver && !featuresAccess.isSubscribed:
        return "Your free trial is active - upgrade anytime to keep your QR codes working.";
      case featuresAccess.isTrialOver && !featuresAccess.isSubscribed:
        return "Your QR codes are currently disabled. Upgrade to restore access and keep using them";
      case featuresAccess.isSubscribed:
        return "You’re currently on a paid plan. Adjust your preferences anytime — no commitment";
      default:
        return null;
    }
  }, []);

  return (
    <Flex gap="3" direction="column" className="mt-[14px] lg:mt-[22px]">
      <Heading
        as="h1"
        size={{ initial: "7", lg: "8" }}
        align="center"
        className="text-neutral"
      >
        <Text>
          Choose a plan that{" "}
          <span className="bg-qr-gradient inline-block bg-clip-text text-transparent">
            fits you best
          </span>
        </Text>
      </Heading>
      <Heading
        as="h2"
        size={{ initial: "3", lg: "5" }}
        align="center"
        weight="regular"
        className="text-neutral"
      >
        {subHeaderText}
      </Heading>
    </Flex>
  );
};
