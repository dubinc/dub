import { PlansFeatures } from "@/ui/plans/components/plans-features.tsx";
import { capitalizeFirstLetter } from "@/ui/plans/utils.ts";
import { ResponseQrCode } from "@/ui/qr-code/qr-codes-container.tsx";
import { Button } from "@dub/ui";
import { cn } from "@dub/utils/src";
import { Flex, Heading, Text } from "@radix-ui/themes";
import { FC } from "react";

interface IPopularQrInfo {
  qrCodeDemo: any;
  demoProps: any;
  mostScannedQR: ResponseQrCode | null;
  isTrialOver: boolean;
  handleScroll: () => void;
}

export const PopularQrInfo: FC<IPopularQrInfo> = ({
  qrCodeDemo,
  demoProps,
  mostScannedQR,
  isTrialOver,
  handleScroll,
}) => {
  return (
    <Flex
      direction="column"
      className="border-border-500 gap-3 rounded-xl border p-3 lg:flex-1 lg:gap-[18px] lg:px-6 lg:py-4"
    >
      <Heading
        as="h2"
        align={{ initial: "center", lg: "left" }}
        size={{ initial: "3", lg: "4" }}
        className="text-neutral"
      >
        Your most popular QR code is now Deactivated
      </Heading>

      <div className="border-border-200 h-px w-full border-t" />

      <Flex
        direction="row"
        align="start"
        gap={{ initial: "4", lg: "6" }}
        className="[&_svg:first-child]:h-[180px] [&_svg:first-child]:w-[138px] lg:[&_svg:first-child]:h-[209px] lg:[&_svg:first-child]:w-[158px]"
      >
        <div className="relative flex-shrink-0">
          <qrCodeDemo.Component {...demoProps} />

          <div className="absolute bottom-0 left-1/2 h-[80px] w-[158px] -translate-x-1/2 bg-gradient-to-t from-white via-white/75 to-transparent" />
        </div>

        <Flex
          direction="column"
          gap={{ initial: "2", lg: "3" }}
          justify="center"
          className="w-full flex-1"
        >
          <Flex direction="column" gap="1">
            <Text
              as="span"
              size={{ initial: "1", lg: "2" }}
              className="text-neutral-800"
            >
              QR Code Name:
            </Text>
            <Text
              as="span"
              size={{ initial: "1", lg: "2" }}
              weight="bold"
              className="text-neutral"
            >
              {mostScannedQR?.title || mostScannedQR?.title || "web-1"}
            </Text>
          </Flex>

          <Flex direction="column" gap="1">
            <Text
              as="span"
              size={{ initial: "1", lg: "2" }}
              className="text-neutral-800"
            >
              Type:
            </Text>
            <Text
              as="span"
              size={{ initial: "1", lg: "2" }}
              weight="bold"
              className="text-neutral"
            >
              {capitalizeFirstLetter(mostScannedQR?.qrType || "website")}
            </Text>
          </Flex>

          <Flex direction="column" gap="1">
            <Text
              as="span"
              size={{ initial: "1", lg: "2" }}
              className="text-neutral-800"
            >
              Number of scans:
            </Text>
            <Text
              as="span"
              size={{ initial: "1", lg: "2" }}
              weight="bold"
              className="text-neutral"
            >
              {(mostScannedQR && mostScannedQR.link?.clicks) || 231}
            </Text>
          </Flex>

          <Flex direction="column" gap="1">
            <Text
              as="span"
              size={{ initial: "1", lg: "2" }}
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
                className={cn("text-primary text-xs font-medium lg:text-sm", {
                  "text-red-600": isTrialOver,
                })}
              >
                {isTrialOver ? "Deactivated" : "Active"}
              </span>
            </div>
          </Flex>
        </Flex>
      </Flex>

      <div className="hidden lg:block">
        <PlansFeatures />
      </div>

      <Button
        className="block lg:hidden"
        text={isTrialOver ? "Restore QR Code" : "Upgrade Plan"}
        onClick={handleScroll}
      />
    </Flex>
  );
};
