'use client'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Cursor, CursorFollow, CursorProvider } from "@/components/ui/cursor";
import { Icon } from "@iconify/react";
import { FC } from "react";
import { Palette, ImageIcon, Sparkles, Download, FileImage, Code } from "lucide-react";

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
        <Icon icon={item.icon} className="h-6 w-6 text-primary" />
        <span className="text-xs font-medium text-foreground">{item.label}</span>
      </div>
    ))}
  </div>
);

const CustomizationVisual = () => (
  <div className="flex flex-col gap-4">
    {/* Color Palette */}
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Palette className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-foreground">Colors</span>
      </div>
      <div className="flex gap-2">
        {["#006666", "#0066CC", "#25BD8B", "#FF6B6B", "#FFD93D", "#6C5CE7"].map((color, idx) => (
          <div
            key={idx}
            className="h-8 w-8 rounded-full border-2 border-white shadow-sm transition-transform hover:scale-110"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </div>

    {/* Design Tools */}
    <div className="grid grid-cols-2 gap-2">
      <div className="flex items-center gap-2 rounded-lg bg-white/80 p-2">
        <ImageIcon className="h-4 w-4 text-secondary" />
        <span className="text-xs font-medium text-foreground">Add Logo</span>
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-white/80 p-2">
        <Sparkles className="h-4 w-4 text-secondary" />
        <span className="text-xs font-medium text-foreground">Styles</span>
      </div>
    </div>
  </div>
);

const DownloadVisual = () => (
  <div className="flex flex-col gap-4">
    {/* Format Options */}
    <div className="grid grid-cols-3 gap-3">
      {[
        { icon: FileImage, label: "PNG", color: "text-primary" },
        { icon: Code, label: "SVG", color: "text-secondary" },
        { icon: FileImage, label: "JPEG", color: "text-primary" },
      ].map((format, idx) => (
        <div
          key={idx}
          className="flex flex-col items-center justify-center gap-2 rounded-lg bg-white/80 p-3 transition-all hover:bg-white hover:shadow-md"
        >
          <format.icon className={`h-6 w-6 ${format.color}`} />
          <span className="text-xs font-semibold text-foreground">{format.label}</span>
        </div>
      ))}
    </div>

    {/* Download Action */}
    <div className="flex items-center justify-center gap-2 rounded-lg bg-primary/10 px-4 py-3">
      <Download className="h-5 w-5 text-primary" />
      <span className="text-sm font-semibold text-primary">High Quality Export</span>
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
    <Card className="group transition-all duration-300 hover:border-primary">
      <CardHeader className="gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-full">
            <div
              className="absolute inset-0 -m-[2px] rounded-full"
              style={{
                background: "linear-gradient(90deg, #115740 20.53%, #25BD8B 37.79%)",
                padding: "2px",
              }}
            >
              <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-sm font-semibold text-foreground">
                {cardNumber}
              </div>
            </div>
          </div>
          <CardTitle className="text-lg font-semibold transition-colors duration-300 group-hover:text-primary">
            {title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative flex h-52 w-full items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 p-6">
          <CursorProvider>
            {renderVisual()}

            <Cursor>
              <svg
                className="size-6 text-primary"
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
              <div className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white shadow-lg">
                {cursorText}
              </div>
            </CursorFollow>
          </CursorProvider>
        </div>
      </CardContent>
      <CardFooter>
        <CardDescription className="text-base">{content}</CardDescription>
      </CardFooter>
    </Card>
  );
};
