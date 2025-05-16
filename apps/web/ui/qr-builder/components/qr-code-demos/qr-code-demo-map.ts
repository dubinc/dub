import { EQRType } from "../../constants/get-qr-config";
import { QRCodeDemoWebsite } from "./demos/website";
import { QRCodeDemoWhatsapp } from "./demos/whatsapp";
import { QRCodeDemoWifi } from "./demos/wifi";

export const QRCodeDemoMap = {
  [EQRType.WEBSITE]: {
    Component: QRCodeDemoWebsite,
    propsKeys: ["websiteLink"],
  },
  [EQRType.WHATSAPP]: {
    Component: QRCodeDemoWhatsapp,
    propsKeys: ["number", "message"],
  },
  [EQRType.WIFI]: {
    Component: QRCodeDemoWifi,
    propsKeys: ["networkName"],
  },
};
