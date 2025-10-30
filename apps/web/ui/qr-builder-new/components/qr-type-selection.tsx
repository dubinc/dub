"use client";

import { cn } from "@dub/utils";
import { FC } from "react";
import {
  EQRType,
  LINKED_QR_TYPES,
  QR_TYPES,
} from "../constants/get-qr-config.ts";
import { QrTypeIcon } from "./qr-type-icon";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";

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
      !LINKED_QR_TYPES.includes(qrType.id) || qrType.id === EQRType.WEBSITE,
  );

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {filteredQrTypes.map((type, idx) => {
        const isSelected = selectedQRType === type.id;

        return (
          <div
            key={type.id}
            className={cn(
              "group relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300 ease-in-out",
              "border border-secondary/20 hover:border-secondary",
              isSelected && "border-secondary/40"
            )}
            onClick={() => onSelect(type.id)}
            onMouseEnter={() => onHover(type.id)}
            onMouseLeave={() => onHover(null)}
          >
            <Card 
              className={cn(
                "h-full border-none shadow-none transition-all duration-300",
                "group-hover:bg-secondary/10"
              )}
            >
              <CardContent className="p-6">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-full border border-secondary/20 bg-secondary/10">
                  <QrTypeIcon
                    icon={type.icon}
                    idx={idx}
                    isActive={isSelected}
                    className="size-7 text-secondary"
                  />
                </div>
              </CardContent>
              <div className="space-y-6 px-6 pb-6">
                <CardTitle className="text-2xl font-medium text-secondary">
                  {type.label}
                </CardTitle>
                <CardDescription className="text-lg">
                  {type.info}
                </CardDescription>
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  );
};
