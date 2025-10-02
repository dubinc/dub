import QrAppLinkFull from "@/ui/landing/assets/png/get-qr-app-link-full.png";
import QrFeedbackFull from "@/ui/landing/assets/png/get-qr-feedback-full.png";
import QrImagesFull from "@/ui/landing/assets/png/get-qr-images-full.png";
import QrPDFFull from "@/ui/landing/assets/png/get-qr-pdf-full.png";
import QrSocialFull from "@/ui/landing/assets/png/get-qr-social-full.png";
import QrVideosFull from "@/ui/landing/assets/png/get-qr-videos-full.png";
import QrWebsiteFull from "@/ui/landing/assets/png/get-qr-website-full.png";
import QrWhatsappFull from "@/ui/landing/assets/png/get-qr-whatsapp-full.png";
import QrWifiFull from "@/ui/landing/assets/png/get-qr-wifi-full.png";
import { StaticImageData } from "next/image";

export enum EQRType {
  WEBSITE = "website",
  PDF = "pdf",
  IMAGE = "image",
  VIDEO = "video",
  WHATSAPP = "whatsapp",
  SOCIAL = "social",
  WIFI = "wifi",
  APP_LINK = "app",
  FEEDBACK = "feedback",
}

export type QRType = {
  id: EQRType;
  label: string;
  info: string;
  icon: string;
  img: StaticImageData;
  content: string;
  yourContentColumnTitle: string;
  scrollTo?: EQRType;
};

export const QR_TYPES: QRType[] = [
  {
    id: EQRType.WEBSITE,
    label: "Website",
    info: "Open a website or landing page",
    icon: "streamline:web",
    img: QrWebsiteFull,
    content:
      "Turn every scan into a visit! Link your website to a QR code and make it easy for customers, clients, or followers to connect with your brand in seconds.",
    yourContentColumnTitle: "Your Link",
    scrollTo: EQRType.WEBSITE,
  },
  {
    id: EQRType.PDF,
    label: "PDF",
    info: "Open a PDF document",
    icon: "hugeicons:pdf-02",
    img: QrPDFFull,
    content:
      "Share important documents instantly! Link your PDF to a QR code and give people quick and easy access to menus, guides, brochures, or portfolios—anytime, anywhere.",
    yourContentColumnTitle: "Your PDF",
    scrollTo: EQRType.PDF,
  },
  {
    id: EQRType.WHATSAPP,
    label: "Whatsapp",
    info: "Start a WhatsApp chat instantly",
    icon: "basil:whatsapp-outline",
    img: QrWhatsappFull,
    content:
      "Start conversations instantly! Use a QR code to let customers, clients, or friends message you on WhatsApp with a single scan.",
    yourContentColumnTitle: "Your Number",
    scrollTo: EQRType.WHATSAPP,
  },
  {
    id: EQRType.WIFI,
    label: "Wifi",
    icon: "streamline:wifi",
    info: "Connect to a Wifi network",
    img: QrWifiFull,
    content:
      "Instant Wifi access—no typing required! Use a QR code to let guests connect to your network effortlessly by scanning, making it perfect for homes, cafés, offices, and events.",
    yourContentColumnTitle: "Wifi Name",
    scrollTo: EQRType.WIFI,
  },
  {
    id: EQRType.IMAGE,
    label: "Image",
    info: "Display an image or photo",
    icon: "hugeicons:ai-image",
    img: QrImagesFull,
    content:
      "Showcase your visuals with ease! Use a QR code to share product galleries, event photos, or special moments instantly—perfect for businesses, creatives, and personal use.",
    yourContentColumnTitle: "Your Image",
    scrollTo: EQRType.IMAGE,
  },
  {
    id: EQRType.VIDEO,
    label: "Video",
    info: "Display a video with one scan",
    icon: "hugeicons:ai-video",
    img: QrVideosFull,
    content:
      "Bring your content to life! Use a QR code to instantly share videos—whether it's tutorials, trailers, promotions, or educational content—anytime, anywhere.",
    yourContentColumnTitle: "Your Video",
    scrollTo: EQRType.VIDEO,
  },
  {
    id: EQRType.SOCIAL,
    label: "Social Media Link",
    info: "Open a website or landing page",
    icon: "solar:add-circle-broken",
    img: QrSocialFull,
    content:
      "Grow your audience effortlessly! Use a QR code to share your social media profiles in one scan—making it easy for people to follow, connect, and engage with your content.",
    yourContentColumnTitle: "Your Link",
    scrollTo: EQRType.WEBSITE,
  },
  {
    id: EQRType.APP_LINK,
    label: "App Link",
    info: "Open a website or landing page",
    icon: "meteor-icons:link",
    img: QrAppLinkFull,
    content:
      "Make app downloads effortless! Use a QR code to instantly direct users to your app’s download page—no searching required. Perfect for boosting installs and engagement.",
    yourContentColumnTitle: "Your App",
    scrollTo: EQRType.WEBSITE,
  },
  {
    id: EQRType.FEEDBACK,
    label: "Feedback Request",
    info: "Open a website or landing page",
    icon: "hugeicons:bubble-chat-favourite",
    img: QrFeedbackFull,
    content:
      "Get valuable feedback in seconds! Use a QR code to collect customer insights instantly—helping you improve your business and enhance the customer experience.",
    yourContentColumnTitle: "Your Link",
    scrollTo: EQRType.WEBSITE,
  },
];

export const ANALYTICS_QR_TYPES: EQRType[] = [
  EQRType.WEBSITE,
  EQRType.PDF,
  EQRType.WHATSAPP,
  EQRType.IMAGE,
  EQRType.VIDEO,
];

export const ANALYTICS_QR_TYPES_DATA = QR_TYPES.filter((qr) =>
  ANALYTICS_QR_TYPES.includes(qr.id),
);

export const LINKED_QR_TYPES: EQRType[] = [
  EQRType.WEBSITE,
  EQRType.APP_LINK,
  EQRType.SOCIAL,
  EQRType.FEEDBACK,
];

export const FILE_QR_TYPES: EQRType[] = [
  EQRType.PDF,
  EQRType.IMAGE,
  EQRType.VIDEO,
] as const;

export const QR_STYLES_OPTIONS = [
  {
    id: "frame",
    label: "Frame",
  },
  {
    id: "style",
    label: "Style",
  },
  {
    id: "shape",
    label: "Shape",
  },
  {
    id: "logo",
    label: "Logo",
  },
];

export const QR_GENERATION_STEPS = [
  {
    id: "content",
    label: "Content",
  },
  {
    id: "design",
    label: "Design",
  },
];
