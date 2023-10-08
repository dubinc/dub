import ModalProvider from "#/ui/modal-provider";
import { inter, satoshi } from "@/styles/fonts";
import "@/styles/globals.css";
import { cn } from "@dub/utils";
import { Analytics } from "@vercel/analytics/react";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";
import { Toaster } from "sonner";

function MyApp({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps<{ session: Session }>) {
  return (
    <SessionProvider session={session}>
      <Toaster closeButton />
      <ModalProvider>
        <main className={cn(satoshi.variable, inter.variable)}>
          <Component {...pageProps} />
        </main>
      </ModalProvider>
      <Analytics />
    </SessionProvider>
  );
}

export default MyApp;
