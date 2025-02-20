"use client";

import {
  ClientOnly,
  Copy,
  Download,
  ShimmerDots,
  Switch,
  useMediaQuery,
} from "@dub/ui";
import { DUB_QR_LOGO, cn } from "@dub/utils";
import { HelpCircle } from "lucide-react";
import { useState } from "react";

export function QR() {
  const { isMobile } = useMediaQuery();

  const [hideLogo, setHideLogo] = useState(false);

  return (
    <div className="size-full [mask-image:linear-gradient(black_70%,transparent)]">
      <div
        className="mx-3.5 flex origin-top scale-95 cursor-default flex-col gap-6 rounded-xl border border-neutral-200 bg-white p-4 shadow-[0_20px_20px_0_#00000017]"
        aria-hidden
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium">QR Code Design</h3>
          <div className="max-md:hidden" aria-hidden>
            <kbd className="flex size-6 cursor-default items-center justify-center rounded-md border border-neutral-200 font-sans text-xs text-neutral-950">
              Q
            </kbd>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-700">
                QR Code Preview
              </span>
              <HelpCircle className="size-4 text-neutral-500" />
            </div>
            <div className="flex h-6 items-center gap-3 px-1">
              <Download className="size-4 text-neutral-500" />
              <Copy className="size-4 text-neutral-500" />
            </div>
          </div>
          <div className="relative mt-2 flex h-40 items-center justify-center overflow-hidden rounded-md border border-neutral-300">
            <ClientOnly>
              {!isMobile && (
                <ShimmerDots className="opacity-30 [mask-image:radial-gradient(40%_80%,transparent_50%,black)]" />
              )}
            </ClientOnly>
            <div className="relative flex size-full items-center justify-center">
              <QRCode hideLogo={hideLogo} />
            </div>
          </div>
        </div>

        {/* Logo toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-700">Logo</span>
            <HelpCircle className="size-4 text-neutral-500" />
          </div>
          <Switch
            checked={!hideLogo}
            fn={(checked) => {
              setHideLogo(!checked);
            }}
          />
        </div>
      </div>
    </div>
  );
}

function QRCode({ hideLogo }: { hideLogo: boolean }) {
  return (
    <svg width="128" height="128" viewBox="0 0 29 29">
      <path fill="#fff" d="M0 0h29v29H0z" shapeRendering="crispEdges" />
      <path
        d="M2 2h7v1H2zM10 2h1v1H10zM12 2h2v1H12zM17 2h1v1H17zM20,2 h7v1H20zM2 3h1v1H2zM8 3h1v1H8zM11 3h1v1H11zM13 3h3v1H13zM17 3h1v1H17zM20 3h1v1H20zM26,3 h1v1H26zM2 4h1v1H2zM4 4h3v1H4zM8 4h1v1H8zM10 4h2v1H10zM18 4h1v1H18zM20 4h1v1H20zM22 4h3v1H22zM26,4 h1v1H26zM2 5h1v1H2zM4 5h3v1H4zM8 5h1v1H8zM10 5h1v1H10zM13 5h2v1H13zM17 5h2v1H17zM20 5h1v1H20zM22 5h3v1H22zM26,5 h1v1H26zM2 6h1v1H2zM4 6h3v1H4zM8 6h1v1H8zM12 6h2v1H12zM17 6h2v1H17zM20 6h1v1H20zM22 6h3v1H22zM26,6 h1v1H26zM2 7h1v1H2zM8 7h1v1H8zM10 7h4v1H10zM15 7h1v1H15zM17 7h2v1H17zM20 7h1v1H20zM26,7 h1v1H26zM2 8h7v1H2zM10 8h1v1H10zM12 8h1v1H12zM14 8h1v1H14zM16 8h1v1H16zM18 8h1v1H18zM20,8 h7v1H20zM10 9h1v1H10zM12 9h1v1H12zM14 9h1v1H14zM16 9h1v1H16zM3 10h1v1H3zM5 10h1v1H5zM7 10h5v1H7zM13 10h3v1H13zM17 10h1v1H17zM19 10h3v1H19zM23 10h2v1H23zM26,10 h1v1H26zM3 11h4v1H3zM10 11h1v1H10zM12 11h1v1H12zM15 11h2v1H15zM19 11h3v1H19zM26,11 h1v1H26zM2 12h1v1H2zM7 12h2v1H7zM11 12h2v1H11zM14 12h3v1H14zM19 12h1v1H19zM21 12h2v1H21zM25,12 h2v1H25zM2 13h3v1H2zM6 13h1v1H6zM13 13h1v1H13zM15 13h1v1H15zM20 13h1v1H20zM22 13h1v1H22zM3 14h1v1H3zM6 14h4v1H6zM13 14h2v1H13zM16 14h1v1H16zM19 14h2v1H19zM23 14h1v1H23zM25,14 h2v1H25zM11 15h1v1H11zM14 15h2v1H14zM20 15h2v1H20zM23 15h2v1H23zM26,15 h1v1H26zM2 16h1v1H2zM4 16h1v1H4zM7 16h2v1H7zM10 16h1v1H10zM16 16h1v1H16zM20 16h3v1H20zM24 16h1v1H24zM26,16 h1v1H26zM3 17h1v1H3zM6 17h1v1H6zM10 17h1v1H10zM12 17h1v1H12zM15 17h3v1H15zM19 17h1v1H19zM22 17h1v1H22zM25 17h1v1H25zM2 18h2v1H2zM8 18h2v1H8zM11 18h1v1H11zM13 18h2v1H13zM18 18h7v1H18zM10 19h1v1H10zM14 19h1v1H14zM16 19h1v1H16zM18 19h1v1H18zM22 19h2v1H22zM26,19 h1v1H26zM2 20h7v1H2zM10 20h5v1H10zM16 20h3v1H16zM20 20h1v1H20zM22 20h2v1H22zM25,20 h2v1H25zM2 21h1v1H2zM8 21h1v1H8zM10 21h1v1H10zM15 21h2v1H15zM18 21h1v1H18zM22 21h4v1H22zM2 22h1v1H2zM4 22h3v1H4zM8 22h1v1H8zM11 22h1v1H11zM14 22h1v1H14zM18 22h6v1H18zM26,22 h1v1H26zM2 23h1v1H2zM4 23h3v1H4zM8 23h1v1H8zM10 23h2v1H10zM14 23h2v1H14zM18 23h1v1H18zM21 23h4v1H21zM2 24h1v1H2zM4 24h3v1H4zM8 24h1v1H8zM11 24h2v1H11zM14 24h1v1H14zM16 24h3v1H16zM21 24h2v1H21zM24 24h1v1H24zM26,24 h1v1H26zM2 25h1v1H2zM8 25h1v1H8zM10 25h1v1H10zM12 25h1v1H12zM14 25h2v1H14zM17 25h4v1H17zM23 25h1v1H23zM2 26h7v1H2zM12 26h4v1H12zM18 26h2v1H18zM21 26h1v1H21zM25,26 h2v1H25z"
        shapeRendering="crispEdges"
      />
      <rect
        width="7.35"
        height="7.2"
        x="10.9"
        y="10.9"
        fill="#fff"
        className={cn("transition-opacity", hideLogo && "opacity-0")}
      />
      <image
        width="6.25"
        height="6.25"
        x="11.375"
        y="11.375"
        href={DUB_QR_LOGO}
        preserveAspectRatio="none"
        className={cn("transition-opacity", hideLogo && "opacity-0")}
      />
    </svg>
  );
}
