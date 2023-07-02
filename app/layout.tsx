import "@/styles/globals.css";
import { satoshi, inter } from "@/styles/fonts";
import { Analytics } from "@vercel/analytics/react";
import { cn, constructMetadata } from "#/lib/utils";

export const metadata = constructMetadata({});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={cn(satoshi.variable, inter.variable)}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
