import { QRCodeDemoImage } from "@/ui/qr-builder/components/qr-code-demos/demos/image.tsx";
import QRCodeDemoPdf from "@/ui/qr-builder/components/qr-code-demos/demos/pdf.tsx";
import { QRCodeDemoVideo } from "@/ui/qr-builder/components/qr-code-demos/demos/video.tsx";
import { EQRType } from "../../constants/get-qr-config";
import { QRCodeDemoWebsite } from "./demos/website";
import { QRCodeDemoWhatsapp } from "./demos/whatsapp";
import { QRCodeDemoWifi } from "./demos/wifi";

const addSmallPreview = (propsKeys: string[]) => [...propsKeys, "smallPreview"];

export const QRCodeDemoMap = {
  [EQRType.WEBSITE]: {
    Component: QRCodeDemoWebsite,
    propsKeys: addSmallPreview(["websiteLink"]),
  },
  [EQRType.WHATSAPP]: {
    Component: QRCodeDemoWhatsapp,
    propsKeys: addSmallPreview(["number", "message"]),
  },
  [EQRType.WIFI]: {
    Component: QRCodeDemoWifi,
    propsKeys: addSmallPreview(["networkName"]),
  },
  [EQRType.PDF]: {
    Component: QRCodeDemoPdf,
    propsKeys: addSmallPreview(["filesPDF"]),
  },
  [EQRType.IMAGE]: {
    Component: QRCodeDemoImage,
    propsKeys: addSmallPreview(["filesImage"]),
  },
  [EQRType.VIDEO]: {
    Component: QRCodeDemoVideo,
    propsKeys: addSmallPreview(["filesVideo"]),
  },
};
