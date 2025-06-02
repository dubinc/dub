import { PLAN_FEATURES } from "@/ui/plans/constants.ts";
import { capitalizeFirstLetter } from "@/ui/plans/utils.ts";
import { ResponseQrCode } from "@/ui/qr-code/qr-codes-container.tsx";
import { cn } from "@dub/utils/src";
import { Flex, Heading, Text } from "@radix-ui/themes";
import { Check } from "lucide-react";
import { FC } from "react";

interface IPopularQrInfo {
  qrCodeDemo: any;
  demoProps: any;
  mostScannedQR: ResponseQrCode | null;
  isTrialOver: boolean;
}

export const PopularQrInfo: FC<IPopularQrInfo> = ({
  qrCodeDemo,
  demoProps,
  mostScannedQR,
  isTrialOver,
}) => {
  return (
    <Flex
      direction="column"
      className="border-border-500 gap-[18px] rounded-xl border p-4 md:flex-1 md:px-6 md:py-4"
    >
      <Heading
        as="h2"
        size={{ initial: "3", md: "4" }}
        className="text-neutral"
      >
        Your most popular QR code is now Deactivated
      </Heading>

      <div className="border-border-200 h-px w-full border-t" />

      <Flex
        direction="row"
        align="start"
        gap={{ initial: "4", md: "6" }}
        className="[&_svg:first-child]:h-[180px] [&_svg:first-child]:w-[138px] md:[&_svg:first-child]:h-[209px] md:[&_svg:first-child]:w-[158px]"
      >
        <div className="flex-shrink-0">
          <qrCodeDemo.Component {...demoProps} />
        </div>

        <Flex
          direction="column"
          gap={{ initial: "2", md: "3" }}
          justify="center"
          className="w-full flex-1"
        >
          <Flex direction="column" gap="1">
            <Text
              as="span"
              size={{ initial: "1", md: "2" }}
              className="text-neutral-800"
            >
              Your QR Code Name:
            </Text>
            <Text
              as="span"
              size={{ initial: "1", md: "2" }}
              weight="bold"
              className="text-neutral"
            >
              {mostScannedQR?.title || mostScannedQR?.title || "web-1"}
            </Text>
          </Flex>

          <Flex direction="column" gap="1">
            <Text
              as="span"
              size={{ initial: "1", md: "2" }}
              className="text-neutral-800"
            >
              Type:
            </Text>
            <Text
              as="span"
              size={{ initial: "1", md: "2" }}
              weight="bold"
              className="text-neutral"
            >
              {capitalizeFirstLetter(mostScannedQR?.qrType || "website")}
            </Text>
          </Flex>

          <Flex direction="column" gap="1">
            <Text
              as="span"
              size={{ initial: "1", md: "2" }}
              className="text-neutral-800"
            >
              Number of scans:
            </Text>
            <Text
              as="span"
              size={{ initial: "1", md: "2" }}
              weight="bold"
              className="text-neutral"
            >
              {(mostScannedQR && mostScannedQR.link?.clicks) || 231}
            </Text>
          </Flex>

          <Flex direction="column" gap="1">
            <Text
              as="span"
              size={{ initial: "1", md: "2" }}
              className="text-neutral-800"
            >
              QR Code Status:
            </Text>
            <div
              className={cn(
                "bg-primary-100 border-primary inline-flex w-fit min-w-[64px] items-center justify-center rounded-md border p-0.5 px-1",
                {
                  "border-red-600 bg-red-100": isTrialOver,
                },
              )}
            >
              <span
                className={cn("text-primary text-xs font-medium md:text-sm", {
                  "text-red-600": isTrialOver,
                })}
              >
                {isTrialOver ? "Deactivated" : "Active"}
              </span>
            </div>
          </Flex>
        </Flex>
      </Flex>

      <Flex
        direction="column"
        align="center"
        justify="center"
        gap={{ initial: "2", md: "3" }}
        className="bg-primary-200 rounded-lg p-3 md:p-3.5"
      >
        {PLAN_FEATURES.map((feature, index) => (
          <Flex
            key={index}
            direction="row"
            align="center"
            className="w-full gap-1.5"
          >
            <Check
              className="text-primary h-4 w-4 md:h-[18px] md:w-[18px]"
              strokeWidth={2}
            />
            <Text
              as="span"
              size={{ initial: "1", md: "2" }}
              className="text-neutral"
            >
              {feature}
            </Text>
          </Flex>
        ))}
      </Flex>
    </Flex>
  );
};
