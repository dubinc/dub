import { inter, satoshi } from "@/styles/fonts";
import "@/styles/globals.css";
import { Analytics as DubAnalytics } from "@dub/analytics/react";
import { TooltipProvider } from "@dub/ui/src/tooltip";
import { cn, constructMetadata } from "@dub/utils";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AxiomWebVitals } from "next-axiom";
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
        <AxiomWebVitals />
        <TooltipProvider>
          <Toaster closeButton className="pointer-events-auto" />
          {children}
          <DubAnalytics
            cookieOptions={{
              domain: process.env.NEXT_PUBLIC_VERCEL_ENV
                ? `.${process.env.NEXT_PUBLIC_APP_DOMAIN}`
                : undefined,
            }}
          />
          <VercelAnalytics />
          <SpeedInsights />
        </TooltipProvider>
      </body>
    </html>
  );
}
