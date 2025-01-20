import { geistMono, inter, satoshi } from "@/styles/fonts";
import "@/styles/globals.css";
import { cn, constructMetadata } from "@dub/utils";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import RootProviders from "./providers";

export const metadata = constructMetadata();

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <html
        lang="en"
        className={cn(satoshi.variable, inter.variable, geistMono.variable)}
      >
        <body>
          <RootProviders>{children}</RootProviders>
        </body>
      </html>
    </NextIntlClientProvider>
  );
}
