import { Chrome, Safari } from "components/shared/icons/devices";

export default function DeviceSVG({
  display,
  className,
}: {
  display: string;
  className: string;
}) {
  switch (display) {
    case "Chrome":
      return <Chrome className={className} />;
    case "Safari":
      return <Safari className={className} />;
    case "Firefox":
      return <Chrome className={className} />;
    case "Microsoft Edge":
      return <Chrome className={className} />;
    case "Opera":
      return <Chrome className={className} />;
    case "Bot":
      return (
        <img
          src={`https://avatars.dicebear.com/api/bottts/dub.svg`}
          className={className}
        />
      );
    default:
      return <Chrome className={className} />;
  }
}
