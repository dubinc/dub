import { title, description, image } from "@/lib/constants";
import "@/styles/globals.css";
import { satoshi, inter } from "@/styles/fonts";
import { Analytics } from "@vercel/analytics/react";
import clsx from "clsx";
import { Providers } from "./providers";

export const metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    images: [
      {
        url: image,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [image],
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
