import {
  Africa,
  Asia,
  Europe,
  Globe,
  NorthAmerica,
  Oceania,
  SouthAmerica,
} from "@dub/ui/icons";

export default function ContinentIcon({
  display,
  className,
}: {
  display: string;
  className?: string;
}) {
  switch (display) {
    case "AF":
      return <Africa className={className} />;
    case "AS":
      return <Asia className={className} />;
    case "EU":
      return <Europe className={className} />;
    case "NA":
      return <NorthAmerica className={className} />;
    case "OC":
      return <Oceania className={className} />;
    case "SA":
      return <SouthAmerica className={className} />;
    default:
      return <Globe className={className} />;
  }
}
