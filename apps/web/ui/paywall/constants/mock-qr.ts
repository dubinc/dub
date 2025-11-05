import { QrStorageData } from "@/ui/qr-builder/types/types";
import { APP_DOMAIN } from '@dub/utils';

export const MOCK_QR: QrStorageData = {
  id: "demo-qr-id",
  title: "Universal QR Code",
  data: APP_DOMAIN,
  qrType: "website" as any,
  description: null,
  archived: false,
  styles: {
    width: 300,
    height: 300,
    type: "svg",
    data: APP_DOMAIN,
    margin: 10,
    qrOptions: { typeNumber: 0, mode: "Byte", errorCorrectionLevel: "Q" },
    dotsOptions: { type: "rounded", color: "#265F31" },
    backgroundOptions: { color: "#ffffff" },
    cornersSquareOptions: { type: "dot", color: "#265F31" },
    cornersDotOptions: { type: "dots", color: "#265F31" },
    imageOptions: {
      imageSize: 0.4,
      hideBackgroundDots: true,
      crossOrigin: "anonymous",
      margin: 10,
    },
  },
  frameOptions: {
    id: "envelope",
    color: "#239F69",
    text: "Create Me",
    textColor: "#1CAB7B",
  },
  fileId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: "demo-user-id",
  linkId: "demo-link-id",
  workspaceId: "demo-workspace-id",
  user: {} as any,
  link: {
    id: "demo-link-id",
    shortLink: APP_DOMAIN,
  } as any,
};
