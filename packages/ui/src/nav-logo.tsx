"use client";

import { cn } from "@dub/utils";
import * as Popover from "@radix-ui/react-popover";
import { BoxSelect, Home, LayoutGrid, Type } from "lucide-react";
import { useParams } from "next/navigation";
import { MouseEvent, useCallback, useContext, useState } from "react";
import { toast } from "sonner";
import { Button, ButtonProps } from "./button";
import { Logo } from "./logo";
import { NavContext } from "./nav";
import { Wordmark } from "./wordmark";

const logoSvg = `<svg width="65" height="64" viewBox="0 0 65 64" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M32.5 64C50.1731 64 64.5 49.6731 64.5 32C64.5 20.1555 58.0648 9.81393 48.5 4.28099V31.9999V47.9998H40.5V45.8594C38.1466 47.2207 35.4143 47.9999 32.5 47.9999C23.6634 47.9999 16.5 40.8364 16.5 31.9999C16.5 23.1633 23.6634 15.9999 32.5 15.9999C35.4143 15.9999 38.1466 16.779 40.5 18.1404V1.00812C37.943 0.350018 35.2624 0 32.5 0C14.8269 0 0.500038 14.3269 0.500038 32C0.500038 49.6731 14.8269 64 32.5 64Z" fill="black"/>
</svg>`;

const wordmarkSvg = `<svg width="177" height="64" viewBox="0 0 177 64" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M106.5 8H112.5V31.8666C112.5 31.911 112.501 31.9554 112.501 31.9999C112.501 32.0444 112.5 32.0888 112.5 32.1332V46H106.5V43.4909C104.232 45.0724 101.475 45.9999 98.5003 45.9999C90.7682 45.9999 84.5 39.7319 84.5 31.9999C84.5 24.2679 90.7682 17.9999 98.5003 17.9999C101.475 17.9999 104.232 18.9274 106.5 20.5089V8ZM98.5 39.9996C102.918 39.9996 106.5 36.418 106.5 31.9998C106.5 27.5816 102.918 24 98.5 24C94.0818 24 90.5 27.5816 90.5 31.9998C90.5 36.418 94.0818 39.9996 98.5 39.9996ZM148.5 8.0001H154.5V20.5096C156.768 18.9278 159.526 18.0002 162.5 18.0002C170.233 18.0002 176.501 24.2682 176.501 32.0002C176.501 39.7322 170.233 46.0002 162.5 46.0002C154.768 46.0002 148.5 39.7322 148.5 32.0002V32.0001V8.0001ZM162.5 39.9997C166.918 39.9997 170.5 36.4181 170.5 31.9999C170.5 27.5817 166.918 24.0001 162.5 24.0001C158.082 24.0001 154.5 27.5817 154.5 31.9999C154.5 36.4181 158.082 39.9997 162.5 39.9997ZM122.5 18H116.5V32C116.5 33.8385 116.862 35.659 117.566 37.3576C118.269 39.0561 119.301 40.5995 120.601 41.8995C121.901 43.1995 123.444 44.2307 125.143 44.9343C126.841 45.6379 128.662 46 130.5 46C132.339 46 134.159 45.6379 135.858 44.9343C137.557 44.2307 139.1 43.1995 140.4 41.8995C141.7 40.5995 142.731 39.0561 143.435 37.3576C144.139 35.659 144.501 33.8385 144.501 32H144.5V18H138.5V32H138.5C138.5 34.1216 137.657 36.1563 136.157 37.6566C134.657 39.1568 132.622 39.9996 130.5 39.9996C128.378 39.9996 126.344 39.1568 124.843 37.6566C123.343 36.1563 122.5 34.1216 122.5 32H122.5V18Z" fill="black"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M32.5 64C50.1731 64 64.5 49.6731 64.5 32C64.5 20.1555 58.0648 9.81393 48.5 4.28099V31.9999V47.9998H40.5V45.8594C38.1466 47.2207 35.4143 47.9999 32.5 47.9999C23.6634 47.9999 16.5 40.8364 16.5 31.9999C16.5 23.1633 23.6634 15.9999 32.5 15.9999C35.4143 15.9999 38.1466 16.779 40.5 18.1404V1.00812C37.943 0.350018 35.2624 0 32.5 0C14.8269 0 0.500038 14.3269 0.500038 32C0.500038 49.6731 14.8269 64 32.5 64Z" fill="black"/>
</svg>`;

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  } catch (e) {
    console.error("Failed to copy to clipboard.", e);
    toast.error("Failed to copy to clipboard.");
  }
}

/**
 * The Dub logo with a custom context menu for copying/navigation,
 * for use in the top site nav
 */
export function NavLogo({
  variant = "full",
  isInApp,
  className,
}: {
  variant?: "full" | "symbol";
  isInApp?: boolean;
  className?: string;
}) {
  const { domain = "dub.co" } = useParams() as { domain: string };

  const { theme } = useContext(NavContext);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleContextMenu = useCallback((e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsPopoverOpen(true);
  }, []);

  return (
    <Popover.Root open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <Popover.Anchor asChild>
        <div onContextMenu={handleContextMenu} className="max-w-fit">
          {variant === "full" ? (
            <Wordmark className={className} />
          ) : (
            <Logo
              className={cn(
                "h-8 w-8 transition-all duration-75 active:scale-95",
                className,
              )}
            />
          )}
        </div>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          sideOffset={14}
          align="start"
          className={cn(
            "z-50 -mt-1.5 -translate-x-10",
            theme === "dark" && "dark",
          )}
          onClick={(e) => {
            e.stopPropagation();
            setIsPopoverOpen(false);
          }}
        >
          <div className="grid gap-1 rounded-lg border border-gray-200 bg-white p-2 drop-shadow-sm sm:min-w-[240px] dark:border-white/[0.15] dark:bg-black">
            <ContextMenuButton
              text="Copy Logo as SVG"
              variant="outline"
              onClick={() => copy(logoSvg)}
              icon={<Logo className="h-4 w-4" />}
            />
            <ContextMenuButton
              text="Copy Wordmark as SVG"
              variant="outline"
              onClick={() => copy(wordmarkSvg)}
              icon={<Type strokeWidth={2} className="h-4 w-4" />}
            />
            <ContextMenuButton
              text="Brand Guidelines"
              variant="outline"
              onClick={() => window.open("https://dub.co/brand", "_blank")}
              icon={<BoxSelect strokeWidth={2} className="h-4 w-4" />}
            />
            {/* If it's in the app or it's a domain placeholder page (not dub.co homepage), show the home button */}
            {isInApp || domain != "dub.co" ? (
              <ContextMenuButton
                text="Home Page"
                variant="outline"
                onClick={() =>
                  window.open(
                    `https://dub.co${isInApp ? "/home" : ""}`,
                    "_blank",
                  )
                }
                icon={<Home strokeWidth={2} className="h-4 w-4" />}
              />
            ) : (
              <ContextMenuButton
                text="Dashboard"
                variant="outline"
                onClick={() => window.open("https://app.dub.co", "_blank")}
                icon={<LayoutGrid strokeWidth={2} className="h-4 w-4" />}
              />
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ContextMenuButton({ className, ...rest }: ButtonProps) {
  return (
    <Button
      className={cn(
        "h-9 justify-start px-3 font-medium hover:text-gray-700 dark:text-white/70 dark:hover:bg-white/[0.15] dark:hover:text-white",
        className,
      )}
      {...rest}
    />
  );
}
