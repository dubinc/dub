import { inter, satoshi } from "@/styles/fonts";
import "@/styles/globals.css";
import { cn, constructMetadata } from "@dub/utils";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "sonner";

export const metadata = constructMetadata();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn(satoshi.variable, inter.variable)}>
      <body>
        <Toaster closeButton />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
