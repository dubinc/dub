import { GeistMono, GeistSans, satoshi } from "@/styles/fonts";
import "@/styles/globals.css";
import { cn, constructMetadata } from "@dub/utils";
import Providers from "./providers";

export const metadata = constructMetadata();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={cn(satoshi.variable, GeistMono.variable, GeistSans.variable)}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
