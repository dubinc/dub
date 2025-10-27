import { QRType } from "@/ui/qr-builder/constants/get-qr-config.ts";
import { cn } from "@dub/utils/src";
import { Icon } from "@iconify/react";
import { Text } from "@radix-ui/themes";

interface IQRCardType {
  className?: string;
  currentQrTypeInfo: QRType;
}

export function QrCardType({ className, currentQrTypeInfo }: IQRCardType) {
  return (
    <div
      className={cn(
        "text-primary flex flex-row items-center gap-1 lg:w-[100px] lg:justify-center",
        className,
      )}
    >
      <Icon icon={currentQrTypeInfo!.icon!} className="text-lg" />
      <Text as="span" size="2" weight="bold">
        {currentQrTypeInfo!.label!}
      </Text>
    </div>
  );
}
