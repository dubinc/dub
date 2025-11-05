"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Cursor, CursorFollow, CursorProvider } from "@/components/ui/cursor";
import { Icon } from "@iconify/react";
import { cn } from "@dub/utils";
import {
  Code,
  Download,
  FileImage,
  ImageIcon,
  Palette,
  Sparkles,
} from "lucide-react";
import { FC } from "react";

interface IGetInfoCardProps {
  title: string;
  content: string;
  cardNumber: number;
  cursorText: string;
  visualType: "selection" | "customization" | "download";
}

const SelectionVisual = () => (
  <div className="grid grid-cols-3 gap-3">
    {[
      { icon: "streamline:web", label: "Website" },
      { icon: "hugeicons:pdf-02", label: "PDF" },
      { icon: "hugeicons:ai-video", label: "Video" },
      { icon: "basil:whatsapp-outline", label: "WhatsApp" },
      { icon: "hugeicons:ai-image", label: "Image" },
      { icon: "streamline:wifi", label: "WiFi" },
    ].map((item, idx) => (
      <div
        key={idx}
        className="flex flex-col items-center justify-center gap-2 rounded-lg bg-white/80 p-3 transition-all hover:bg-white hover:shadow-md"
      >
        <Icon icon={item.icon} className="text-primary h-6 w-6" />
        <span className="text-foreground text-xs font-medium">
          {item.label}
        </span>
      </div>
    ))}
  </div>
);

const CustomizationVisual = () => (
  <div className="flex flex-col gap-4">
    {/* Color Palette */}
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Palette className="text-primary h-4 w-4" />
        <span className="text-foreground text-xs font-medium">Colors</span>
      </div>
      <div className="flex gap-2">
        {["#006666", "#0066CC", "#25BD8B", "#FF6B6B", "#FFD93D", "#6C5CE7"].map(
          (color, idx) => (
            <div
              key={idx}
              className="h-8 w-8 rounded-full border-2 border-white shadow-sm transition-transform hover:scale-110"
              style={{ backgroundColor: color }}
            />
          ),
        )}
      </div>
    </div>

    {/* Design Tools */}
    <div className="grid grid-cols-2 gap-2">
      <div className="flex items-center gap-2 rounded-lg bg-white/80 p-2 transition-all hover:scale-105 hover:shadow-md">
        <ImageIcon className="text-secondary h-4 w-4" />
        <span className="text-foreground text-xs font-medium">Add Logo</span>
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-white/80 p-2 transition-all hover:scale-105 hover:shadow-md">
        <Sparkles className="text-secondary h-4 w-4" />
        <span className="text-foreground text-xs font-medium">Styles</span>
      </div>
    </div>
  </div>
);

const DownloadVisual = () => (
  <div className="flex flex-col gap-4">
    {/* Format Options */}
    <div className="grid grid-cols-3 gap-3">
      {[
        { icon: FileImage, label: "PNG" },
        { icon: Code, label: "SVG" },
        { icon: FileImage, label: "JPEG" },
      ].map((format, idx) => (
        <div
          key={idx}
          className="flex flex-col items-center justify-center gap-2 rounded-lg bg-white/80 p-3 transition-all hover:bg-white hover:shadow-md"
        >
          <format.icon className={`h-6 w-6 text-primary`} />
          <span className="text-foreground text-xs font-semibold">
            {format.label}
          </span>
        </div>
      ))}
    </div>

    {/* Download Action */}
    <div className="bg-primary/10 flex items-center justify-center gap-2 rounded-lg px-4 py-3 transition-all hover:-translate-y-1 hover:shadow-md">
      <Download className="text-primary h-5 w-5" />
      <span className="text-primary text-sm font-semibold">
        High Quality Export
      </span>
    </div>
  </div>
);

export const InfoCard: FC<IGetInfoCardProps> = ({
  title,
  content,
  cardNumber,
  cursorText,
  visualType,
}) => {
  const renderVisual = () => {
    switch (visualType) {
      case "selection":
        return <SelectionVisual />;
      case "customization":
        return <CustomizationVisual />;
      case "download":
        return <DownloadVisual />;
    }
  };

  return (
    <Card className="hover:border-primary group transition-all duration-300">
      <CardContent className="pt-6">
        <CursorProvider>
          <div className="from-primary/10 via-primary/5 to-secondary/10 relative flex h-52 w-full items-center justify-center rounded-lg bg-gradient-to-br p-6">
            {renderVisual()}
          </div>
          <Cursor>
            <svg
              className={cn("size-6 text-primary")}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 40 40"
            >
              <path
                fill="currentColor"
                d="M1.8 4.4 7 36.2c.3 1.8 2.6 2.3 3.6.8l3.9-5.7c1.7-2.5 4.5-4.1 7.5-4.3l6.9-.5c1.8-.1 2.5-2.4 1.1-3.5L5 2.5c-1.4-1.1-3.5 0-3.3 1.9Z"
              />
            </svg>
          </Cursor>
          <CursorFollow>
            <div className={cn("rounded-lg px-2 py-1 text-sm text-white shadow-lg bg-primary")}>
              {cursorText}
            </div>
          </CursorFollow>
        </CursorProvider>
      </CardContent>
      <CardHeader className="gap-3">
        <div className="flex items-center gap-2">
          <Avatar className="size-10">
            <AvatarFallback className="!bg-primary !text-primary-foreground shadow-sm">
              <span className="text-sm font-semibold text-white">
                {cardNumber}
              </span>
            </AvatarFallback>
          </Avatar>
          <CardTitle className="group-hover:text-primary text-lg font-semibold transition-colors duration-300">
            {title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardFooter>
        <CardDescription className="text-base">{content}</CardDescription>
      </CardFooter>
    </Card>
  );
};
