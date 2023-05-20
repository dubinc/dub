import "@/styles/globals.css";
import { satoshi, inter } from "@/styles/fonts";
import { Analytics } from "@vercel/analytics/react";
import clsx from "clsx";
import { Providers } from "./providers";

const title = "Dub - Link Management for Modern Marketing Teams";
const description =
  "Dub is an open-source link management tool for modern marketing teams to create, share, and track short links.";

export const metadata = {
  title: {
    default: title,
  },
  description,
  openGraph: {
    title,
    description,
    images: "/_static/thumbnail.png",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: "/_static/thumbnail.png",
    creator: "@dubdotsh",
  },
  metadataBase: new URL("https://dub.sh"),
  themeColor: "#FFF",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={clsx(satoshi.variable, inter.variable)}>
        <Providers>
          {children}
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
