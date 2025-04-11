import { DeviceTabs } from "@/lib/analytics/types";
import { Chrome, Safari } from "@/ui/shared/icons/devices";
import { BlurImage } from "@dub/ui";
import {
  AppleLogo,
  Cube,
  CursorRays,
  Desktop,
  GamingConsole,
  MobilePhone,
  QRCode,
  TV,
  Tablet,
  Watch,
  Window,
} from "@dub/ui/icons";

export default function DeviceIcon({
  display,
  tab,
  className,
}: {
  display: string;
  tab: DeviceTabs;
  className: string;
}) {
  if (tab === "devices") {
    switch (display) {
      case "Desktop":
        return <Desktop className={className} />;
      case "Mobile":
        return <MobilePhone className={className} />;
      case "Tablet":
        return <Tablet className={className} />;
      case "Wearable":
        return <Watch className={className} />;
      case "Console":
        return <GamingConsole className={className} />;
      case "Smarttv":
        return <TV className={className} />;
      default:
        return <Desktop className={className} />;
    }
  } else if (tab === "browsers") {
    switch (display) {
      case "Chrome":
        return <Chrome className={className} />;
      case "Safari":
      case "Mobile Safari":
        return <Safari className={className} />;
      case "Unknown":
        return <Window className={className} />;
      default:
        return (
          <BlurImage
            src={`https://faisalman.github.io/ua-parser-js/images/browsers/${display.toLowerCase()}.png`}
            alt={display}
            width={20}
            height={20}
            className={className}
          />
        );
    }
  } else if (tab === "os") {
    switch (display) {
      case "Mac OS":
        return (
          <BlurImage
            src="https://assets.dub.co/misc/icons/macos.png"
            alt={display}
            width={20}
            height={20}
            className="h-4 w-4"
          />
        );
      case "iOS":
        return <AppleLogo className="-ml-1 h-5 w-5" />;
      case "Unknown":
        return <Cube className={className} />;
      default:
        return (
          <BlurImage
            src={`https://faisalman.github.io/ua-parser-js/images/os/${display.toLowerCase()}.png`}
            alt={display}
            width={30}
            height={20}
            className="h-4 w-5"
          />
        );
    }
  } else if (tab === "triggers") {
    if (display === "qr") {
      return <QRCode className={className} />;
    } else {
      return <CursorRays className={className} />;
    }
  } else {
    return (
      <BlurImage
        src={`https://faisalman.github.io/ua-parser-js/images/companies/default.png`}
        alt={display}
        width={20}
        height={20}
        className={className}
      />
    );
  }
}
