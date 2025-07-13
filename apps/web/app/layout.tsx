import { inter } from "@/styles/fonts";
import "@/styles/globals.css";
import { cn, constructMetadata } from "@dub/utils";
import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import { GtmInitializerComponent } from "core/integration/analytic/components/gtm-initializer";
import { getUserCookieService } from "../core/services/cookie/user-session.service.ts";
import { AnalyticInitializerComponent } from "./analytic-initializer.component.tsx";
import RootProviders from "./providers";

export const metadata = constructMetadata();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sessionId, user } = getUserCookieService();
  
  console.log("RootLayout sessionId:", sessionId);
  console.log("RootLayout user:", user);
  console.log("RootLayout user exists:", !!user);
  console.log("RootLayout sessionId exists:", !!sessionId);

  return (
    <html lang="en" className={cn(inter.className)}>
      <body>
        <Theme>
          <RootProviders>{children}</RootProviders>
          <GtmInitializerComponent />
          <AnalyticInitializerComponent sessionId={sessionId || "fallback-session"} />
        </Theme>
      </body>
    </html>
  );
}
