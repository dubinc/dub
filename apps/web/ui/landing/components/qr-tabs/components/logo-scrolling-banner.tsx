import {
  BarchartIcon,
  BenzingaIcon,
  FoxIcon,
  GlobeAndMailIcon,
  MSNIcon,
  YahooIcon,
} from "@/ui/landing/assets/svg/news";
import { ScrollingBanner } from "@/ui/landing/components/scrolling-banner.tsx";

// Icon components as news
const news = [
  FoxIcon,
  GlobeAndMailIcon,
  YahooIcon,
  BarchartIcon,
  BenzingaIcon,
  MSNIcon,
];

export const LogoScrollingBanner = () => <ScrollingBanner data={news} />;
