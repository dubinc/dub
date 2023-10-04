import "@/styles/globals.css";
import { satoshi, inter } from "@/styles/fonts";
import { cn, constructMetadata } from "#/lib/utils";
import Providers from "./providers";

export const metadata = constructMetadata();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={cn(satoshi.variable, inter.variable)}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
