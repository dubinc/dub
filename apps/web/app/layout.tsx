import { geistMono, inter, satoshi } from "@/styles/fonts";
import "@/styles/globals.css";
import { cn, constructMetadata } from "@dub/utils";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import RootProviders from "./providers";
export const metadata = constructMetadata();

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang="en"
      className={cn(satoshi.variable, inter.variable, geistMono.variable)}
    >
      <body>
        <NextIntlClientProvider messages={messages}>
          <RootProviders>{children}</RootProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
