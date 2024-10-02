import { geistMono, inter, satoshi } from "@/styles/fonts";
import "@/styles/globals.css";
import { Analytics as DubAnalytics } from "@dub/analytics/react";
import { KeyboardShortcutProvider } from "@dub/ui";
import { TooltipProvider } from "@dub/ui/src/tooltip";
import { cn, constructMetadata } from "@dub/utils";
import { Toaster } from "sonner";

export const metadata = constructMetadata();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={cn(satoshi.variable, inter.variable, geistMono.variable)}
    >
      <body>
        <TooltipProvider>
          <KeyboardShortcutProvider>
            <Toaster closeButton className="pointer-events-auto" />
            {children}
            <DubAnalytics
              apiKey={process.env.NEXT_PUBLIC_DUB_PUBLISHABLE_KEY}
            />
          </KeyboardShortcutProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
