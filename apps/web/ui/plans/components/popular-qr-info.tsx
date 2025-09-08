"use client";

import { FeaturesAccess } from "@/lib/actions/check-features-access-auth-less";
import { PlansFeatures } from "@/ui/plans/components/plans-features.tsx";
import { QRCodeDemoMap } from "@/ui/qr-builder/components/qr-code-demos/qr-code-demo-map";
import {
  EQRType,
  FILE_QR_TYPES,
  QR_TYPES,
} from "@/ui/qr-builder/constants/get-qr-config.ts";
import { QrStorageData } from "@/ui/qr-builder/types/types.ts";
import { parseQRData } from "@/ui/utils/qr-data-parser";
import { Button } from "@dub/ui";
import { cn } from "@dub/utils/src";
import { Flex, Heading, Text } from "@radix-ui/themes";
import { Options } from "qr-code-styling/lib/types";
import { FC, useMemo } from "react";

interface IPopularQrInfo {
  mostScannedQR: QrStorageData | null;
  featuresAccess: FeaturesAccess;
  handleScroll: () => void;
}

export const PopularQrInfo: FC<IPopularQrInfo> = ({
  mostScannedQR,
  featuresAccess,
  handleScroll,
}) => {
  const qrCodeDemo = mostScannedQR?.qrType
    ? QRCodeDemoMap[mostScannedQR.qrType as EQRType]
    : QRCodeDemoMap[EQRType.WEBSITE];

  const demoProps = useMemo(() => {
    if (!mostScannedQR || !qrCodeDemo || !mostScannedQR.data) return {};

    const qrType = mostScannedQR.qrType as EQRType;
    const stylesData = (mostScannedQR.styles as Options)?.data;

    if (FILE_QR_TYPES.includes(qrType)) {
      return parseQRData(qrType, mostScannedQR.link.url);
    }

    return parseQRData(qrType, stylesData || mostScannedQR.data);
  }, [mostScannedQR, qrCodeDemo]);

  return (
    <Flex
      direction="column"
      className="border-border-500 gap-3 rounded-xl border p-3 lg:flex-1 lg:gap-[18px] lg:px-6 lg:py-4"
    >
      <Heading
        as="h2"
        align="left"
        size={{ initial: "2", lg: "4" }}
        className="text-neutral"
      >
        {!featuresAccess.featuresAccess
          ? "Your most popular QR code is now deactivated"
          : "Your top performing QR"}
      </Heading>

      <div className="border-border-200 h-px w-full border-t" />

      <Flex direction="row" align="start" gap={{ initial: "4", lg: "6" }}>
        <div className="relative flex-shrink-0">
          <qrCodeDemo.Component {...demoProps} smallPreview />

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
              {QR_TYPES.find(
                (item) => (mostScannedQR?.qrType || "website") === item.id,
              )?.label || "Website"}
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
              {(mostScannedQR && mostScannedQR.link?.clicks) ?? 231}
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
                  "border-red-600 bg-red-100": !featuresAccess.featuresAccess,
                },
              )}
            >
              <span
                className={cn("text-primary text-xs font-medium lg:text-sm", {
                  "text-red-600": !featuresAccess.featuresAccess,
                })}
              >
                {!featuresAccess.featuresAccess ? "Deactivated" : "Active"}
              </span>
            </div>
          </Flex>
        </Flex>
      </Flex>

      <div className="hidden lg:block">
        <PlansFeatures />
      </div>

      {!featuresAccess.isSubscribed && (
        <Button
          className="block lg:hidden"
          text={
            !featuresAccess.isTrialOver ? "Upgrade Plan" : "Restore QR Code"
          }
          onClick={handleScroll}
        />
      )}
    </Flex>
  );
};
