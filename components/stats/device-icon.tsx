import { DeviceTabs } from "@/lib/stats";
import { Chrome, Safari, Apple } from "components/shared/icons/devices";
import BlurImage from "@/components/shared/blur-image";

export default function DeviceIcon({
  display,
  tab,
  className,
}: {
  display: string;
  tab: DeviceTabs;
  className: string;
}) {
  if (display === "Bot") {
    return (
      <img
        alt={display}
        src={`https://avatars.dicebear.com/api/bottts/dub.svg`}
        className={className}
      />
    );
  }
  if (tab === "device") {
    return (
      <BlurImage
        src={
          display === "Desktop"
            ? `https://faisalman.github.io/ua-parser-js/images/types/default.png`
            : `https://faisalman.github.io/ua-parser-js/images/types/${display}.png`
        }
        alt={display}
        width={20}
        height={20}
        sizes="10vw"
        className={className}
      />
    );
  } else if (tab === "browser") {
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
          src="/static/icons/macos.png"
          alt={display}
          width={20}
          height={20}
          className="w-4 h-4"
        />
      );
    } else if (display === "iOS") {
      return <Apple className="w-5 h-5 -ml-1" />;
    } else {
      return (
        <BlurImage
          src={`https://faisalman.github.io/ua-parser-js/images/os/${display.toLowerCase()}.png`}
          alt={display}
          width={30}
          height={20}
          className="w-5 h-4"
        />
      );
    }
  } else if (tab === "bot") {
    return (
      <img
        alt={display}
        src={`https://avatars.dicebear.com/api/bottts/${display}.svg`}
        className={className}
      />
    );
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
