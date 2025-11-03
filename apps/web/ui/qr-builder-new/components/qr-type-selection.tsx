"use client";

import { cn } from "@dub/utils";
import { ArrowRight } from "lucide-react";
import { FC, useEffect } from "react";
import {
  EQRType,
  LINKED_QR_TYPES,
  QR_TYPES,
} from "../constants/get-qr-config.ts";
import { QrTypeIcon } from "./qr-type-icon";

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
    <div className="max-w-7xl w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-3">
      {filteredQrTypes.map((type, idx) => {
        const isSelected = selectedQRType === type.id;

        return (
          <div
            key={type.id}
            className={cn(
              "qr-type-card group relative cursor-pointer overflow-hidden rounded-xl transition-all duration-300 ease-in-out",
              "border-secondary/20 hover:border-primary border shadow",
              // isSelected && "border-pr",
            )}
            onClick={() => onSelect(type.id)}
            onMouseEnter={() => onHover(type.id)}
            onMouseLeave={() => onHover(null)}
          >
            {/* Animated gradient background */}
            <div className="from-background to-muted/30 absolute inset-0 z-0 bg-gradient-to-br" />
            {/* Grid pattern overlay */}
            <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />
            
            {/* Blob effect */}
            {/* <div className="blob bg-secondary absolute left-0 top-0 z-[1] h-[150px] w-[150px] rounded-full opacity-0 blur-2xl transition-all duration-300 ease-in-out" /> */}
            {/* <div className="fake-blob absolute left-0 top-0 z-[1] h-40 w-40 rounded-full [display:hidden]" /> */}

            <div className="relative z-10 flex flex-col items-start gap-2 p-3 md:gap-4 md:p-8">
              {/* <div className={cn(
                "flex size-14 items-center justify-center rounded-lg border transition-all duration-300",
                isSelected ? "border-secondary bg-secondary/10" : "bg-muted/50"
              )}> */}
              <QrTypeIcon
                icon={type.icon}
                idx={idx}
                isActive={isSelected}
                className="text-primary size-5 md:size-7"
              />
              {/* </div> */}
              <h3 className="text-black text-sm font-semibold md:text-2xl">
                {type.label}
              </h3>
              <div className="flex w-full items-center justify-between gap-2 md:gap-3">
                <p className="text-muted-foreground text-xs leading-relaxed md:text-sm">{type.info}</p>
                <ArrowRight className="text-primary size-4 shrink-0 transition-all duration-300 group-hover:translate-x-1 group-hover:scale-110 md:size-7" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
