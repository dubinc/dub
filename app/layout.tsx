import "@/styles/globals.css";
import { satoshi, inter } from "@/styles/fonts";
import { Analytics } from "@vercel/analytics/react";
import cx from "classnames";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={cx(satoshi.variable, inter.variable)}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
