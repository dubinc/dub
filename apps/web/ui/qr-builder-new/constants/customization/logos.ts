// Logo constants for QR Builder New

import AirbnbLogoIcon from "@/ui/qr-builder/icons/logos/airbnb.svg";
import AppleLogoIcon from "@/ui/qr-builder/icons/logos/apple.svg";
import BinanceLogoIcon from "@/ui/qr-builder/icons/logos/binance.svg";
import BitcoinLogoIcon from "@/ui/qr-builder/icons/logos/bitcoin.svg";
import BoltFoodLogoIcon from "@/ui/qr-builder/icons/logos/bolt-food.svg";
import BookingLogoIcon from "@/ui/qr-builder/icons/logos/booking.svg";
import FacebookLogoIcon from "@/ui/qr-builder/icons/logos/facebook.svg";
import GlovoLogoIcon from "@/ui/qr-builder/icons/logos/glovo.svg";
import GoogleMapsLogoIcon from "@/ui/qr-builder/icons/logos/google-maps.svg";
import GooglePlayLogoIcon from "@/ui/qr-builder/icons/logos/google-play.svg";
import GoogleLogoIcon from "@/ui/qr-builder/icons/logos/google.svg";
import InstagramLogoIcon from "@/ui/qr-builder/icons/logos/instagram.svg";
import LinkLogoIcon from "@/ui/qr-builder/icons/logos/link.svg";
import LinkedInLogoIcon from "@/ui/qr-builder/icons/logos/linkedin.svg";
import LocationLogoIcon from "@/ui/qr-builder/icons/logos/location.svg";
import MailLogoIcon from "@/ui/qr-builder/icons/logos/mail.svg";
import PayPalLogoIcon from "@/ui/qr-builder/icons/logos/paypal.svg";
import RestaurantLogoIcon from "@/ui/qr-builder/icons/logos/restaurant.svg";
import ScanMeLogoIcon from "@/ui/qr-builder/icons/logos/scan-me.svg";
import TripAdvisorLogoIcon from "@/ui/qr-builder/icons/logos/tripadvisor.svg";
import TrustPilotLogoIcon from "@/ui/qr-builder/icons/logos/trustpilot.svg";
import UberEatsLogoIcon from "@/ui/qr-builder/icons/logos/uber-eats.svg";
import WhatsAppLogoIcon from "@/ui/qr-builder/icons/logos/whatsapp.svg";
import WifiLogoIcon from "@/ui/qr-builder/icons/logos/wifi.svg";
import YoutubeLogoIcon from "@/ui/qr-builder/icons/logos/youtube.svg";
import NoLogoIcon from "@/ui/qr-builder/icons/no-logo.svg";

// PDF logos
import PdfIcon1 from "../../icons/logos/pdf/774684_pdf_document_extension_file_format_icon.svg";
import PdfIcon2 from "../../icons/logos/pdf/9022365_file_pdf_duotone_icon.svg";
import PdfIcon3 from "../../icons/logos/pdf/pdf-svgrepo-com.svg";

// Picture/Image logos
import PictureIcon1 from "../../icons/logos/picture/image-landscape-png-svgrepo-com.svg";
import PictureIcon2 from "../../icons/logos/picture/image-media-photo-picture-svgrepo-com.svg";
import PictureIcon3 from "../../icons/logos/picture/image-picture-971-svgrepo-com.svg";
import PictureIcon4 from "../../icons/logos/picture/image-svgrepo-com (2) (1).svg";
import PictureIcon5 from "../../icons/logos/picture/image-svgrepo-com (2).svg";
import PictureIcon6 from "../../icons/logos/picture/image-svgrepo-com (3).svg";
import PictureIcon7 from "../../icons/logos/picture/image-svgrepo-com.svg";
import PictureIcon8 from "../../icons/logos/picture/picture-svgrepo-com.svg";

// Video logos
import VideoIcon1 from "../../icons/logos/video/video-call-svgrepo-com.svg";
import VideoIcon2 from "../../icons/logos/video/video-camera-svgrepo-com.svg";
import VideoIcon3 from "../../icons/logos/video/video-file-svgrepo-com (1).svg";
import VideoIcon4 from "../../icons/logos/video/video-movie-svgrepo-com.svg";
import VideoIcon5 from "../../icons/logos/video/video-svgrepo-com.svg";

// Website logos
import WebsiteIcon1 from "../../icons/logos/website/1873909_world_social media_earth_website_world wide web_icon.svg";
import WebsiteIcon2 from "../../icons/logos/website/532738_browser_checked_domain_internet_url_icon.svg";
import WebsiteIcon3 from "../../icons/logos/website/copy-link-svgrepo-com.svg";
import WebsiteIcon4 from "../../icons/logos/website/unlink-alt-5-svgrepo-com.svg";

// WhatsApp logos
import WhatsAppIcon1 from "../../icons/logos/whatsup/whatsapp-svgrepo-com (1).svg";
import WhatsAppIcon2 from "../../icons/logos/whatsup/whatsapp-svgrepo-com.svg";

// Wifi logos
import WifiIcon1 from "../../icons/logos/wifi/5172988_door_internet_key_lock_password_icon.svg";
import WifiIcon2 from "../../icons/logos/wifi/622392_security_unlock_password_protection_safety_icon.svg";
import WifiIcon3 from "../../icons/logos/wifi/8726436_wifi_icon.svg";

import { IStyleOption } from "../../types/customization";
import { EQRType } from "../get-qr-config";

export const SUGGESTED_LOGOS: IStyleOption[] = [
  {
    id: "logo-none",
    type: "none",
    icon: NoLogoIcon,
  },
  // Website logos
  {
    id: "logo-website-1",
    type: "website",
    icon: WebsiteIcon1,
    relevantFor: [
      EQRType.WEBSITE,
      EQRType.SOCIAL,
      EQRType.APP_LINK,
      EQRType.FEEDBACK,
    ],
  },
  {
    id: "logo-website-2",
    type: "website",
    icon: WebsiteIcon2,
    relevantFor: [
      EQRType.WEBSITE,
      EQRType.SOCIAL,
      EQRType.APP_LINK,
      EQRType.FEEDBACK,
    ],
  },
  {
    id: "logo-website-3",
    type: "website",
    icon: WebsiteIcon3,
    relevantFor: [
      EQRType.WEBSITE,
      EQRType.SOCIAL,
      EQRType.APP_LINK,
      EQRType.FEEDBACK,
    ],
  },
  {
    id: "logo-website-4",
    type: "website",
    icon: WebsiteIcon4,
    relevantFor: [
      EQRType.WEBSITE,
      EQRType.SOCIAL,
      EQRType.APP_LINK,
      EQRType.FEEDBACK,
    ],
  },
  {
    id: "logo-link",
    type: "link",
    icon: LinkLogoIcon,
    relevantFor: [
      EQRType.WEBSITE,
      EQRType.SOCIAL,
      EQRType.APP_LINK,
      EQRType.FEEDBACK,
    ],
  },
  // PDF logos
  {
    id: "logo-pdf-1",
    type: "pdf",
    icon: PdfIcon1,
    relevantFor: [EQRType.PDF],
  },
  {
    id: "logo-pdf-2",
    type: "pdf",
    icon: PdfIcon2,
    relevantFor: [EQRType.PDF],
  },
  {
    id: "logo-pdf-3",
    type: "pdf",
    icon: PdfIcon3,
    relevantFor: [EQRType.PDF],
  },
  // Picture/Image logos
  {
    id: "logo-picture-1",
    type: "picture",
    icon: PictureIcon1,
    relevantFor: [EQRType.IMAGE],
  },
  {
    id: "logo-picture-2",
    type: "picture",
    icon: PictureIcon2,
    relevantFor: [EQRType.IMAGE],
  },
  {
    id: "logo-picture-3",
    type: "picture",
    icon: PictureIcon3,
    relevantFor: [EQRType.IMAGE],
  },
  {
    id: "logo-picture-4",
    type: "picture",
    icon: PictureIcon4,
    relevantFor: [EQRType.IMAGE],
  },
  {
    id: "logo-picture-5",
    type: "picture",
    icon: PictureIcon5,
    relevantFor: [EQRType.IMAGE],
  },
  {
    id: "logo-picture-6",
    type: "picture",
    icon: PictureIcon6,
    relevantFor: [EQRType.IMAGE],
  },
  {
    id: "logo-picture-7",
    type: "picture",
    icon: PictureIcon7,
    relevantFor: [EQRType.IMAGE],
  },
  {
    id: "logo-picture-8",
    type: "picture",
    icon: PictureIcon8,
    relevantFor: [EQRType.IMAGE],
  },
  // Video logos
  {
    id: "logo-video-1",
    type: "video",
    icon: VideoIcon1,
    relevantFor: [EQRType.VIDEO],
  },
  {
    id: "logo-video-2",
    type: "video",
    icon: VideoIcon2,
    relevantFor: [EQRType.VIDEO],
  },
  {
    id: "logo-video-3",
    type: "video",
    icon: VideoIcon3,
    relevantFor: [EQRType.VIDEO],
  },
  {
    id: "logo-video-4",
    type: "video",
    icon: VideoIcon4,
    relevantFor: [EQRType.VIDEO],
  },
  {
    id: "logo-video-5",
    type: "video",
    icon: VideoIcon5,
    relevantFor: [EQRType.VIDEO],
  },
  // WhatsApp logos
  {
    id: "logo-whatsapp-1",
    type: "whatsapp",
    icon: WhatsAppIcon1,
    relevantFor: [EQRType.WHATSAPP],
  },
  {
    id: "logo-whatsapp-2",
    type: "whatsapp",
    icon: WhatsAppIcon2,
    relevantFor: [EQRType.WHATSAPP],
  },
  {
    id: "logo-whatsapp",
    type: "whatsapp",
    icon: WhatsAppLogoIcon,
    relevantFor: [EQRType.WHATSAPP],
  },
  // Wifi logos
  {
    id: "logo-wifi-1",
    type: "wifi",
    icon: WifiIcon1,
    relevantFor: [EQRType.WIFI],
  },
  {
    id: "logo-wifi-2",
    type: "wifi",
    icon: WifiIcon2,
    relevantFor: [EQRType.WIFI],
  },
  {
    id: "logo-wifi-3",
    type: "wifi",
    icon: WifiIcon3,
    relevantFor: [EQRType.WIFI],
  },
  {
    id: "logo-wifi",
    type: "wifi",
    icon: WifiLogoIcon,
    relevantFor: [EQRType.WIFI],
  },
  {
    id: "logo-airbnb",
    type: "airbnb",
    icon: AirbnbLogoIcon,
    relevantFor: [EQRType.WEBSITE, EQRType.SOCIAL],
  },
  {
    id: "logo-apple",
    type: "apple",
    icon: AppleLogoIcon,
    relevantFor: [EQRType.APP_LINK, EQRType.WEBSITE],
  },
  {
    id: "logo-binance",
    type: "binance",
    icon: BinanceLogoIcon,
    relevantFor: [EQRType.WEBSITE, EQRType.APP_LINK],
  },
  {
    id: "logo-bitcoin",
    type: "bitcoin",
    icon: BitcoinLogoIcon,
    relevantFor: [EQRType.WEBSITE],
  },
  {
    id: "logo-bolt-food",
    type: "bolt-food",
    icon: BoltFoodLogoIcon,
    relevantFor: [EQRType.WEBSITE, EQRType.APP_LINK],
  },
  {
    id: "logo-booking",
    type: "booking",
    icon: BookingLogoIcon,
    relevantFor: [EQRType.WEBSITE, EQRType.APP_LINK],
  },
  {
    id: "logo-facebook",
    type: "facebook",
    icon: FacebookLogoIcon,
    relevantFor: [EQRType.SOCIAL, EQRType.WEBSITE],
  },
  {
    id: "logo-glovo",
    type: "glovo",
    icon: GlovoLogoIcon,
    relevantFor: [EQRType.WEBSITE, EQRType.APP_LINK],
  },
  {
    id: "logo-google",
    type: "google",
    icon: GoogleLogoIcon,
    relevantFor: [EQRType.WEBSITE, EQRType.FEEDBACK],
  },
  {
    id: "logo-google-maps",
    type: "google-maps",
    icon: GoogleMapsLogoIcon,
    relevantFor: [EQRType.WEBSITE],
  },
  {
    id: "logo-google-play",
    type: "google-play",
    icon: GooglePlayLogoIcon,
    relevantFor: [EQRType.APP_LINK, EQRType.WEBSITE],
  },
  {
    id: "logo-instagram",
    type: "instagram",
    icon: InstagramLogoIcon,
    relevantFor: [EQRType.SOCIAL, EQRType.WEBSITE],
  },
  {
    id: "logo-linkedin",
    type: "linkedin",
    icon: LinkedInLogoIcon,
    relevantFor: [EQRType.SOCIAL, EQRType.WEBSITE],
  },
  {
    id: "logo-location",
    type: "location",
    icon: LocationLogoIcon,
    relevantFor: [EQRType.WEBSITE],
  },
  {
    id: "logo-mail",
    type: "mail",
    icon: MailLogoIcon,
    relevantFor: [EQRType.WEBSITE, EQRType.FEEDBACK],
  },
  {
    id: "logo-paypal",
    type: "paypal",
    icon: PayPalLogoIcon,
    relevantFor: [EQRType.WEBSITE],
  },
  {
    id: "logo-restaurant",
    type: "restaurant",
    icon: RestaurantLogoIcon,
    relevantFor: [EQRType.WEBSITE, EQRType.PDF],
  },
  {
    id: "logo-scan-me",
    type: "scan-me",
    icon: ScanMeLogoIcon,
  },
  {
    id: "logo-tripadvisor",
    type: "tripadvisor",
    icon: TripAdvisorLogoIcon,
    relevantFor: [EQRType.WEBSITE, EQRType.FEEDBACK],
  },
  {
    id: "logo-trustpilot",
    type: "trustpilot",
    icon: TrustPilotLogoIcon,
    relevantFor: [EQRType.WEBSITE, EQRType.FEEDBACK],
  },
  {
    id: "logo-uber-eats",
    type: "uber-eats",
    icon: UberEatsLogoIcon,
    relevantFor: [EQRType.WEBSITE, EQRType.APP_LINK],
  },
  {
    id: "logo-youtube",
    type: "youtube",
    icon: YoutubeLogoIcon,
    relevantFor: [EQRType.VIDEO, EQRType.SOCIAL, EQRType.WEBSITE],
  },
];

/**
 * Sort logos by relevance to a specific QR type
 * Logos relevant to the QR type appear first, followed by others
 */
export function getSortedLogos(qrType: EQRType | null): IStyleOption[] {
  if (!qrType) {
    return SUGGESTED_LOGOS;
  }

  const relevant: IStyleOption[] = [];
  const others: IStyleOption[] = [];

  SUGGESTED_LOGOS.forEach((logo) => {
    if (logo.relevantFor && logo.relevantFor.includes(qrType)) {
      relevant.push(logo);
    } else {
      others.push(logo);
    }
  });

  return [...relevant, ...others];
}
