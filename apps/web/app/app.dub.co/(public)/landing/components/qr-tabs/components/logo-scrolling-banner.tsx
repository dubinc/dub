import barchart from "@/ui/landing/assets/svg/barchart.svg";
import benzinga from "@/ui/landing/assets/svg/benzinga.svg";
import fox from "@/ui/landing/assets/svg/fox.svg";
import globeAndMail from "@/ui/landing/assets/svg/globe-and-mail.svg";
import msn from "@/ui/landing/assets/svg/msn.svg";
import yahoo from "@/ui/landing/assets/svg/yahoo.svg";
import { ScrollingBanner } from "@/ui/landing/scrolling-banner.tsx";

const news = [fox, globeAndMail, yahoo, barchart, benzinga, msn];

export const LogoScrollingBanner = () => <ScrollingBanner data={news} />;
