import localFont from "next/font/local";
export { GeistMono, GeistSans } from "geist/font";

export const satoshi = localFont({
  src: "../styles/Satoshi-Variable.woff2",
  variable: "--font-satoshi",
  weight: "300 900",
  display: "swap",
  style: "normal",
});
