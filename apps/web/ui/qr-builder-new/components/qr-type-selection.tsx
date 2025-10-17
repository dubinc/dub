"use client";

import { cn } from "@dub/utils";
import { Card, Flex } from "@radix-ui/themes";
import { CircleArrowRight } from "lucide-react";
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

// Arrow color mapping for each QR type (text colors)
const QR_TYPE_ARROW_COLORS: Record<EQRType, string> = {
  [EQRType.WEBSITE]: "group-hover:text-blue-500",
  [EQRType.PDF]: "group-hover:text-orange-500",
  [EQRType.IMAGE]: "group-hover:text-amber-500",
  [EQRType.VIDEO]: "group-hover:text-red-500",
  [EQRType.WHATSAPP]: "group-hover:text-green-500",
  [EQRType.SOCIAL]: "group-hover:text-indigo-500",
  [EQRType.WIFI]: "group-hover:text-purple-500",
  [EQRType.APP_LINK]: "group-hover:text-cyan-500",
  [EQRType.FEEDBACK]: "group-hover:text-amber-500",
};

// Icon background glow colors
const QR_TYPE_ICON_BG: Record<EQRType, string> = {
  [EQRType.WEBSITE]: "bg-blue-100",
  [EQRType.PDF]: "bg-orange-100",
  [EQRType.IMAGE]: "bg-amber-100",
  [EQRType.VIDEO]: "bg-red-100",
  [EQRType.WHATSAPP]: "bg-green-100",
  [EQRType.SOCIAL]: "bg-indigo-100",
  [EQRType.WIFI]: "bg-purple-100",
  [EQRType.APP_LINK]: "bg-cyan-100",
  [EQRType.FEEDBACK]: "bg-amber-100",
};

// Card border colors (hover)
const QR_TYPE_BORDER_COLORS: Record<EQRType, string> = {
  [EQRType.WEBSITE]: "hover:!border-blue-500",
  [EQRType.PDF]: "hover:!border-orange-500",
  [EQRType.IMAGE]: "hover:!border-amber-500",
  [EQRType.VIDEO]: "hover:!border-red-500",
  [EQRType.WHATSAPP]: "hover:!border-green-500",
  [EQRType.SOCIAL]: "hover:!border-indigo-500",
  [EQRType.WIFI]: "hover:!border-purple-500",
  [EQRType.APP_LINK]: "hover:!border-cyan-500",
  [EQRType.FEEDBACK]: "hover:!border-amber-500",
};

// Card border colors (selected)
const QR_TYPE_SELECTED_BORDER: Record<EQRType, string> = {
  [EQRType.WEBSITE]: "!border-blue-500",
  [EQRType.PDF]: "!border-orange-500",
  [EQRType.IMAGE]: "!border-amber-500",
  [EQRType.VIDEO]: "!border-red-500",
  [EQRType.WHATSAPP]: "!border-green-500",
  [EQRType.SOCIAL]: "!border-indigo-500",
  [EQRType.WIFI]: "!border-purple-500",
  [EQRType.APP_LINK]: "!border-cyan-500",
  [EQRType.FEEDBACK]: "!border-amber-500",
};

// Card background colors (when selected)
const QR_TYPE_BG_COLORS: Record<EQRType, string> = {
  [EQRType.WEBSITE]: "bg-blue-50",
  [EQRType.PDF]: "bg-orange-50",
  [EQRType.IMAGE]: "bg-amber-50",
  [EQRType.VIDEO]: "bg-red-50",
  [EQRType.WHATSAPP]: "bg-green-50",
  [EQRType.SOCIAL]: "bg-indigo-50",
  [EQRType.WIFI]: "bg-purple-50",
  [EQRType.APP_LINK]: "bg-cyan-50",
  [EQRType.FEEDBACK]: "bg-amber-50",
};

// Blob hover colors (for mouse-follow effect)
const QR_TYPE_BLOB_COLORS: Record<EQRType, string> = {
  [EQRType.WEBSITE]: "bg-blue-500/30",
  [EQRType.PDF]: "bg-orange-500/30",
  [EQRType.IMAGE]: "bg-amber-500/30",
  [EQRType.VIDEO]: "bg-red-500/30",
  [EQRType.WHATSAPP]: "bg-green-500/30",
  [EQRType.SOCIAL]: "bg-indigo-500/30",
  [EQRType.WIFI]: "bg-purple-500/30",
  [EQRType.APP_LINK]: "bg-cyan-500/30",
  [EQRType.FEEDBACK]: "bg-amber-500/30",
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

  useEffect(() => {
    const all = document.querySelectorAll(".card");

    const handleMouseMove = (ev: MouseEvent) => {
      all.forEach((e) => {
        const blob = e.querySelector(".blob") as HTMLElement;
        const fblob = e.querySelector(".fake-blob") as HTMLElement;

        if (!blob || !fblob) return;

        const rec = fblob.getBoundingClientRect();

        blob.style.opacity = "0.9";

        blob.animate(
          [
            {
              transform: `translate(${
                ev.clientX - rec.left - 40
              }px, ${ev.clientY - rec.top - 40}px)`,
            },
          ],
          {
            duration: 300,
            fill: "forwards",
          },
        );
      });
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-2">
      {filteredQrTypes.map((type, idx) => (
        <div key={type.id} className="card relative overflow-hidden rounded-lg">
          <Card
            size="1"
            className={cn(
              "text-neutral group relative flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 px-5 py-5 font-medium transition-colors [&_div:nth-child(1)>div:first-child]:flex [&_div:nth-child(1)>div:first-child]:flex-row [&_div:nth-child(1)>div:first-child]:items-center [&_div:nth-child(1)>div:first-child]:gap-3 md:[&_div:nth-child(1)>div:first-child]:flex-none md:[&_div:nth-child(1)>div:first-child]:gap-3 [&_div]:p-0",
              "transition-all duration-300 ease-in-out",
              QR_TYPE_BORDER_COLORS[type.id],
              selectedQRType === type.id ? QR_TYPE_SELECTED_BORDER[type.id] : "!border-border-500",
              selectedQRType === type.id ? QR_TYPE_BG_COLORS[type.id] : "!bg-background md:!bg-white",
            )}
            onClick={() => onSelect(type.id)}
            onMouseEnter={() => onHover(type.id)}
            onMouseLeave={() => onHover(null)}
            asChild
          >
            <div className="relative">
              {/* Colored blur effect on top-left */}
              <Flex
                direction={{ initial: "row", md: "column" }}
                align="start"
                gap="2"
                className="relative z-10"
              >
                <div />
                <Flex direction="column">
                  <Flex direction="row" gap="3" align="center">
                    <div className="relative hidden h-12 w-12 items-center justify-center rounded-lg md:flex">
                      <div
                        className={cn(
                          "absolute inset-0 rounded-full blur-sm opacity-80",
                          QR_TYPE_ICON_BG[type.id],
                        )}
                      />
                      <QrTypeIcon
                        icon={type.icon}
                        idx={idx}
                        isActive={selectedQRType === type.id}
                        className="relative z-10 h-6 w-6 flex-none"
                      />
                    </div>
                    <div className="flex items-center gap-2.5">
                      <h3
                        className={cn(
                          "text-neutral group-hover:text-secondary text-lg font-semibold md:text-xl",
                          {
                            "!text-secondary": selectedQRType === type.id,
                          },
                        )}
                      >
                        {type.label}
                      </h3>
                      <CircleArrowRight
                        className={cn(
                          "text-muted-foreground size-5 transition-all duration-300 group-hover:-rotate-45",
                          QR_TYPE_ARROW_COLORS[type.id],
                        )}
                      />
                    </div>
                  </Flex>
                  <p className="text-sm text-neutral-500 md:text-base">
                    {type.info}
                  </p>
                </Flex>
              </Flex>
            </div>
          </Card>

          {/* Mouse follow blob effect */}
          <div className={cn("blob pointer-events-none absolute left-0 top-0 h-20 w-20 rounded-full opacity-0 blur-2xl transition-opacity duration-300", QR_TYPE_BLOB_COLORS[type.id])} />
          <div
            className="fake-blob pointer-events-none absolute left-0 top-0 h-40 w-40 rounded-full"
            style={{ visibility: "hidden" }}
          />
        </div>
      ))}
    </div>
  );
};
