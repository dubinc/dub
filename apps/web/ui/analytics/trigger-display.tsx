import { CursorRays, MarketingTarget, Page2, QRCode } from "@dub/ui";

export const TRIGGER_DISPLAY = {
  qr: {
    title: "QR scan",
    icon: QRCode,
  },
  link: {
    title: "Link click",
    icon: CursorRays,
  },
  pageview: {
    title: "Page View",
    icon: Page2,
  },
  deeplink: {
    title: "Deep Link",
    icon: MarketingTarget,
  },
};
