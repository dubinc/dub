import { EQRType, QR_TYPES, LINKED_QR_TYPES } from "../constants/get-qr-config.ts";
import { QrTypeIcon } from "./qr-type-icon";
import { cn } from "@dub/utils";
import { Card, Flex } from "@radix-ui/themes";
import { FC } from "react";

interface QrTypeSelectionProps {
  selectedQRType: EQRType | null;
  onSelect: (type: EQRType) => void;
  onHover: (type: EQRType | null) => void;
}

export const QrTypeSelection: FC<QrTypeSelectionProps> = ({
  selectedQRType,
  onSelect,
  onHover,
}) => {

  const filteredQrTypes = QR_TYPES.filter(
    (qrType) =>
      !LINKED_QR_TYPES.includes(qrType.id) || qrType.id === EQRType.WEBSITE
  );

  return (
    <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
      {filteredQrTypes.map((type, idx) => (
        <Card
          key={type.id}
          size="1"
          asChild
          className={cn(
            "text-neutral !border-border-500 w-42 group flex min-w-[254px] cursor-pointer items-center justify-center gap-2 rounded-md border px-4 py-3.5 font-medium transition-colors [&_div:first-child]:flex [&_div:first-child]:flex-row [&_div:first-child]:items-center [&_div:first-child]:gap-3 md:[&_div:first-child]:flex-none md:[&_div:first-child]:gap-2 [&_div]:p-0",
            "hover:!bg-secondary-100 hover:!border-secondary group",
            "transition-all duration-300 ease-in-out",
            {
              "!bg-secondary-100 !border-secondary":
                selectedQRType === type.id,
              "!bg-background md:!bg-white": selectedQRType !== type.id,
            }
          )}
          onClick={() => onSelect(type.id)}
          onMouseEnter={() => onHover(type.id)}
          onMouseLeave={() => onHover(null)}
        >
          <Flex
            direction={{ initial: "row", md: "column" }}
            align="start"
            gap="2"
          >
            <QrTypeIcon
              icon={type.icon}
              idx={idx}
              isActive={selectedQRType === type.id}
              className="flex h-8 w-8 md:hidden"
            />
            <Flex direction="column">
              <Flex direction="row" gap="2" align="center">
                <QrTypeIcon
                  icon={type.icon}
                  idx={idx}
                  isActive={selectedQRType === type.id}
                  className="hidden h-5 w-5 flex-none md:flex"
                />
                <h3
                  className={cn(
                    "text-neutral text-md group-hover:text-secondary font-medium md:text-lg",
                    {
                      "!text-secondary": selectedQRType === type.id,
                    }
                  )}
                >
                  {type.label}
                </h3>
              </Flex>
              <p className="text-xs text-neutral-500 md:text-sm">{type.info}</p>
            </Flex>
          </Flex>
        </Card>
      ))}
    </div>
  );
};