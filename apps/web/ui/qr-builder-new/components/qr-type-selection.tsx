"use client";

import { cn } from "@dub/utils";
import { ArrowRightIcon } from "lucide-react";
import Image from "next/image";
import { FC } from "react";
import {
  EQRType,
  LINKED_QR_TYPES,
  QR_TYPES,
} from "../constants/get-qr-config.ts";
import { QrTypeIcon } from "./qr-type-icon";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

// Color configurations for each QR type
const QR_TYPE_COLORS: Record<
  EQRType,
  {
    border: string;
    borderHover: string;
    bg: string;
    bgHover: string;
    text: string;
    textHover: string;
    iconBg: string;
  }
> = {
  [EQRType.WEBSITE]: {
    border: "border-blue-600/30",
    borderHover: "hover:border-blue-600",
    bg: "bg-white/50",
    bgHover: "hover:bg-blue-600/10",
    text: "text-blue-600",
    textHover: "group-hover:text-blue-700",
    iconBg: "bg-card text-blue-600",
  },
  [EQRType.PDF]: {
    border: "border-orange-600/30",
    borderHover: "hover:border-orange-600",
    bg: "bg-white/50",
    bgHover: "hover:bg-orange-600/10",
    text: "text-orange-600",
    textHover: "group-hover:text-orange-700",
    iconBg: "bg-card text-orange-600",
  },
  [EQRType.IMAGE]: {
    border: "border-amber-600/30",
    borderHover: "hover:border-amber-600",
    bg: "bg-white/50",
    bgHover: "hover:bg-amber-600/10",
    text: "text-amber-600",
    textHover: "group-hover:text-amber-700",
    iconBg: "bg-card text-amber-600",
  },
  [EQRType.VIDEO]: {
    border: "border-red-600/30",
    borderHover: "hover:border-red-600",
    bg: "bg-white/50",
    bgHover: "hover:bg-red-600/10",
    text: "text-red-600",
    textHover: "group-hover:text-red-700",
    iconBg: "bg-card text-red-600",
  },
  [EQRType.WHATSAPP]: {
    border: "border-green-600/30",
    borderHover: "hover:border-green-600",
    bg: "bg-white/50",
    bgHover: "hover:bg-green-600/10",
    text: "text-green-600",
    textHover: "group-hover:text-green-700",
    iconBg: "bg-card text-green-600",
  },
  [EQRType.SOCIAL]: {
    border: "border-indigo-600/30",
    borderHover: "hover:border-indigo-600",
    bg: "bg-white/50",
    bgHover: "hover:bg-indigo-600/10",
    text: "text-indigo-600",
    textHover: "group-hover:text-indigo-700",
    iconBg: "bg-card text-indigo-600",
  },
  [EQRType.WIFI]: {
    border: "border-purple-600/30",
    borderHover: "hover:border-purple-600",
    bg: "bg-white/50",
    bgHover: "hover:bg-purple-600/10",
    text: "text-purple-600",
    textHover: "group-hover:text-purple-700",
    iconBg: "bg-card text-purple-600",
  },
  [EQRType.APP_LINK]: {
    border: "border-cyan-600/30",
    borderHover: "hover:border-cyan-600",
    bg: "bg-white/50",
    bgHover: "hover:bg-cyan-600/10",
    text: "text-cyan-600",
    textHover: "group-hover:text-cyan-700",
    iconBg: "bg-card text-cyan-600",
  },
  [EQRType.FEEDBACK]: {
    border: "border-pink-600/30",
    borderHover: "hover:border-pink-600",
    bg: "bg-white/50",
    bgHover: "hover:bg-pink-600/10",
    text: "text-pink-600",
    textHover: "group-hover:text-pink-700",
    iconBg: "bg-card text-pink-600",
  },
};

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
    <>
      {/* Row 1 */}
      <div className="flex w-full gap-6 max-lg:flex-col">
        {filteredQrTypes.slice(0, 3).map((type, idx) => {
          const colors = QR_TYPE_COLORS[type.id];
          const isSelected = selectedQRType === type.id;

          return (
            <Card
              key={type.id}
              className={cn(
                "group flex-1 cursor-pointer transition-all duration-500 hover:flex-[2_1_0%]",
                "shadow-2xl rounded-3xl border-2 bg-white",
                colors.borderHover,
                colors.bgHover,
                isSelected && [
                  colors.border.replace("/30", ""),
                  colors.bg.replace("white/50", colors.bg.split("/")[0].replace("bg-", "") + "-600/10"),
                ],
              )}
              onClick={() => onSelect(type.id)}
              onMouseEnter={() => onHover(type.id)}
              onMouseLeave={() => onHover(null)}
            >
              <CardContent className="flex gap-4 p-4">
                <div className="flex-1 space-y-4">
                  <Avatar className="size-12 shadow-sm transition-transform duration-300 group-hover:scale-110">
                    <AvatarFallback className={colors.iconBg}>
                      <QrTypeIcon
                        icon={type.icon}
                        idx={idx}
                        isActive={isSelected}
                        className="size-6"
                      />
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1.5">
                    <CardTitle
                      className={cn(
                        "text-xl font-semibold transition-colors duration-300",
                        colors.text,
                        colors.textHover,
                      )}
                    >
                      {type.label}
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-700">
                      {type.info}
                    </CardDescription>
                  </div>
                  <div
                    className={cn(
                      "inline-flex items-center gap-2 text-xs font-medium transition-all duration-300",
                      colors.text,
                      colors.textHover,
                    )}
                  >
                    <span>Select</span>
                    <ArrowRightIcon className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                  </div>
                </div>
                <div className="relative w-0 shrink-0 overflow-hidden transition-all duration-500 group-hover:w-24 lg:group-hover:w-32">
                  <Image
                    src={type.img}
                    alt={type.label}
                    className="h-full w-24 object-contain opacity-0 transition-opacity duration-500 group-hover:opacity-100 lg:w-32"
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Row 2 */}
      <div className="flex w-full gap-6 max-lg:flex-col">
        {filteredQrTypes.slice(3, 6).map((type, idx) => {
          const colors = QR_TYPE_COLORS[type.id];
          const isSelected = selectedQRType === type.id;

          return (
            <Card
              key={type.id}
              className={cn(
                "group flex-1 cursor-pointer transition-all duration-500 hover:flex-[2_1_0%]",
                "shadow-2xl rounded-3xl border-2 bg-white",
                colors.borderHover,
                colors.bgHover,
                isSelected && [
                  colors.border.replace("/30", ""),
                  colors.bg.replace("white/50", colors.bg.split("/")[0].replace("bg-", "") + "-600/10"),
                ],
              )}
              onClick={() => onSelect(type.id)}
              onMouseEnter={() => onHover(type.id)}
              onMouseLeave={() => onHover(null)}
            >
            <CardContent className="flex gap-4 p-4">
              <div className="flex-1 space-y-4">
                <Avatar className="size-12 shadow-sm transition-transform duration-300 group-hover:scale-110">
                  <AvatarFallback className={colors.iconBg}>
                    <QrTypeIcon
                      icon={type.icon}
                      idx={idx + 3}
                      isActive={isSelected}
                      className="size-6"
                    />
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1.5">
                  <CardTitle
                    className={cn(
                      "text-xl font-semibold transition-colors duration-300",
                      colors.text,
                      colors.textHover,
                    )}
                  >
                    {type.label}
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-700">
                    {type.info}
                  </CardDescription>
                </div>
                <div
                  className={cn(
                    "inline-flex items-center gap-2 text-xs font-medium transition-all duration-300",
                    colors.text,
                    colors.textHover,
                  )}
                >
                  <span>Select</span>
                  <ArrowRightIcon className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              </div>
              <div className="relative w-0 shrink-0 overflow-hidden transition-all duration-500 group-hover:w-24 lg:group-hover:w-32">
                <Image
                  src={type.img}
                  alt={type.label}
                  className="h-full w-24 object-contain opacity-0 transition-opacity duration-500 group-hover:opacity-100 lg:w-32"
                />
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>
    </>
  );
};
