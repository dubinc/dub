"use client";

import { FeaturesAccess } from "@/lib/actions/check-features-access-auth-less";
import { QrStorageData } from "@/ui/qr-builder/types/types.ts";
import { cn } from "@dub/utils/src";
import { FC } from "react";

interface IPopularQrInfo {
  mostScannedQR: QrStorageData | null;
  featuresAccess: FeaturesAccess;
}

const getStyles = (featuresAccess: FeaturesAccess, archived: boolean) => {
  if (!featuresAccess.featuresAccess) {
    return {
      container: "border-red-600 bg-red-100",
      text: "text-red-600",
      label: "Deactivated",
    }
  }
  if (archived) {
    return {
      container: "border-yellow-600 bg-yellow-100",
      text: "text-yellow-600",
      label: "Paused",
    }
  }
  return {
    label: "Active",
  }
}

export const QrInfoBadge: FC<IPopularQrInfo> = ({
  mostScannedQR,
  featuresAccess,
}) => {
  const { container, text, label } = getStyles(featuresAccess, mostScannedQR?.archived || false);

  return (
    <div
      className={cn(
        "bg-primary-100 border-primary inline-flex w-fit min-w-[64px] items-center justify-center rounded-md border p-0.5 px-1",
        container,
      )}
    >
      <span
        className={cn("text-primary text-xs font-medium lg:text-sm", text)}
      >
        {label}
      </span>
    </div>
  );
};
