import { inter } from "@/styles/fonts";
import "@/styles/globals.css";
import { cn, constructMetadata } from "@dub/utils";
import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import { GtmInitializerComponent } from "core/integration/analytic/components/gtm-initializer";
import RootProviders from "./providers";
export const metadata = constructMetadata();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn(inter.className)}>
      <body>
        <Theme>
          <RootProviders>{children}</RootProviders>
          <GtmInitializerComponent />
        </Theme>
      </body>
    </html>
  );
}
