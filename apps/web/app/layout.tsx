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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sessionId } = await getUserCookieService();

  return (
    <html lang="en" className={cn(inter.className)}>
      <body>
        <Theme>
          <RootProviders>{children}</RootProviders>
          <GtmInitializerComponent />
          {sessionId && <AnalyticInitializerComponent sessionId={sessionId} />}
        </Theme>
      </body>
    </html>
  );
}
