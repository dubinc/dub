import "@/styles/globals.css";
import { satoshi, inter } from "@/styles/fonts";
import { Analytics } from "@vercel/analytics/react";
import clsx from "clsx";
import { constructMetadata } from "#/lib/utils";

export const metadata = constructMetadata({});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={clsx(satoshi.variable, inter.variable)}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
