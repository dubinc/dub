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
        "flex flex-row items-center justify-center gap-1",
        className,
      )}
    >
      <Icon
        icon={currentQrTypeInfo!.icon!}
        className="text-secondary text-lg"
      />
      <Text as="span" size="2" weight="bold" className="text-secondary">
        {currentQrTypeInfo!.label!}
      </Text>
    </div>
  );
}
