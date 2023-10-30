import { DeviceTabs } from "@/lib/stats";
import { BlurImage } from "@/ui/shared/blur-image";
import { Apple, Chrome, Safari } from "@/ui/shared/icons/devices";

export default function DeviceIcon({
  display,
  tab,
  className,
}: {
  display: string;
  tab: DeviceTabs;
  className: string;
}) {
  if (tab === "device") {
    return (
      <BlurImage
        src={
          display === "Desktop"
            ? `https://faisalman.github.io/ua-parser-js/images/types/default.png`
            : `https://faisalman.github.io/ua-parser-js/images/types/${display.toLowerCase()}.png`
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
          src="/_static/icons/macos.png"
          alt={display}
          width={20}
          height={20}
          className="h-4 w-4"
        />
      );
    } else if (display === "iOS") {
      return <Apple className="-ml-1 h-5 w-5" />;
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
