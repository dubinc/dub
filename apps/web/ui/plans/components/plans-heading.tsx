import { FeaturesAccess } from '@/lib/actions/check-features-access-auth-less';
import { Flex, Heading, Text } from "@radix-ui/themes";
import { FC, useMemo } from "react";

interface IPlansHeading {
  featuresAccess: FeaturesAccess;
}

export const PlansHeading: FC<IPlansHeading> = ({
  featuresAccess,
}) => {
  console.log(featuresAccess);
  const subHeaderText = useMemo(() => {
    switch (true) {
      case featuresAccess.status === "trial":
        return "Your free trial is active - upgrade anytime to keep your QR codes working.";
      case !featuresAccess.isSubscribed:
        return "Your QR codes are currently disabled. Choose a plan to restore full QR access";
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
          {featuresAccess.isSubscribed
            ? <>
                Choose a plan that{" "}
                <span className="bg-qr-gradient inline-block bg-clip-text text-transparent">
                  fits you best
                </span>
              </>
            : <>
                Your subscription{" "}
                <span className="bg-qr-gradient inline-block bg-clip-text text-transparent">
                  has expired
                </span>
              </>
          }
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
