import { EQRType } from "../../constants/get-qr-config.ts";
import { QRCodeDemoImage } from "./demos/image";
import { QRCodeDemoPDF } from "./demos/pdf";
import { QRCodeDemoVideo } from "./demos/video";
import { QRCodeDemoWebsite } from "./demos/website";
import { QRCodeDemoWhatsapp } from "./demos/whatsapp";
import { QRCodeDemoWifi } from "./demos/wifi";

interface QRCodeDemoConfig {
  Component: React.ComponentType<any>;
  propsKeys: string[];
}

export const QRCodeDemoMap: Record<EQRType, QRCodeDemoConfig> = {
  [EQRType.WEBSITE]: {
    Component: QRCodeDemoWebsite,
    propsKeys: ["websiteLink"],
  },
  [EQRType.IMAGE]: {
    Component: QRCodeDemoImage,
    propsKeys: ["filesImage"],
  },
  [EQRType.PDF]: {
    Component: QRCodeDemoPDF,
    propsKeys: ["filesPDF"],
  },
  [EQRType.VIDEO]: {
    Component: QRCodeDemoVideo,
    propsKeys: ["filesVideo"],
  },
  [EQRType.WHATSAPP]: {
    Component: QRCodeDemoWhatsapp,
    propsKeys: ["number", "message"],
  },
  [EQRType.WIFI]: {
    Component: QRCodeDemoWifi,
    propsKeys: ["networkName"],
  },
  [EQRType.SOCIAL]: {
    Component: QRCodeDemoWebsite,
    propsKeys: ["websiteLink"],
  },
  [EQRType.APP_LINK]: {
    Component: QRCodeDemoWebsite,
    propsKeys: ["websiteLink"],
  },
  [EQRType.FEEDBACK]: {
    Component: QRCodeDemoWebsite,
    propsKeys: ["websiteLink"],
  },
};
