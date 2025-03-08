export type QRType = {
  id: string;
  label: string;
  icon: string;
  content: string;
};

export const DEFAULT_QR_TYPES: QRType[] = [
  {
    id: "website",
    label: "Website",
    icon: "streamline:web",
    content:
      "Turn every scan into a visit! Link your website to a QR code and make it easy for customers, clients, or followers to connect with your brand in seconds.",
  },
  {
    id: "pdf",
    label: "PDF",
    icon: "hugeicons:pdf-02",
    content:
      "Share important documents instantly! Link your PDF to a QR code and give people quick and easy access to menus, guides, brochures, or portfolios—anytime, anywhere.",
  },
  {
    id: "images",
    label: "Images",
    icon: "hugeicons:ai-image",
    content:
      "Showcase your visuals with ease! Use a QR code to share product galleries, event photos, or special moments instantly—perfect for businesses, creatives, and personal use.",
  },
  {
    id: "video",
    label: "Video",
    icon: "hugeicons:ai-video",
    content:
      "Bring your content to life! Use a QR code to instantly share videos—whether it's tutorials, trailers, promotions, or educational content—anytime, anywhere.",
  },
  {
    id: "whatsapp",
    label: "Whatsapp",
    icon: "basil:whatsapp-outline",
    content:
      "Start conversations instantly! Use a QR code to let customers, clients, or friends message you on WhatsApp with a single scan.",
  },
  {
    id: "social",
    label: "Social Media Link",
    icon: "solar:add-circle-broken",
    content:
      "Grow your audience effortlessly! Use a QR code to share your social media profiles in one scan—making it easy for people to follow, connect, and engage with your content.",
  },
  {
    id: "wifi",
    label: "Wifi",
    icon: "streamline:wifi",
    content:
      "Instant Wi-Fi access—no typing required! Use a QR code to let guests connect to your network effortlessly by scanning, making it perfect for homes, cafés, offices, and events.",
  },
];

export const ADDITIONAL_QR_TYPES: QRType[] = [
  {
    id: "app-link",
    label: "App Link",
    icon: "hugeicons:link-01",
    content:
      "Make app downloads effortless! Use a QR code to instantly direct users to your app’s download page—no searching required. Perfect for boosting installs and engagement.",
  },
  {
    id: "feedback",
    label: "Feedback Request",
    icon: "hugeicons:feedback",
    content:
      "Get valuable feedback in seconds! Use a QR code to collect customer insights instantly—helping you improve your business and enhance the customer experience.",
  },
];

export const QR_TYPES: QRType[] = [...DEFAULT_QR_TYPES, ...ADDITIONAL_QR_TYPES];
