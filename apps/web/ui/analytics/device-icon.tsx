import { DeviceTabs } from "@/lib/analytics/types";
import { Chrome, Safari } from "@/ui/shared/icons/devices";
import { BlurImage } from "@dub/ui";
import {
  AppleLogo,
  CursorRays,
  Desktop,
  GamingConsole,
  MobilePhone,
  QRCode,
  TV,
  Tablet,
  Watch,
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
    if (display === "Chrome") {
      return <Chrome className={className} />;
    } else if (display === "Safari" || display === "Mobile Safari") {
      return <Safari className={className} />;
    } else {
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
    if (display === "Mac OS") {
      return (
        <BlurImage
          src="https://assets.dub.co/misc/icons/macos.png"
          alt={display}
          width={20}
          height={20}
          className="h-4 w-4"
        />
      );
    } else if (display === "iOS") {
      return <AppleLogo className="-ml-1 h-5 w-5" />;
    } else {
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
