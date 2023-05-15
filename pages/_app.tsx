import type { AppProps } from "next/app";
import { Analytics } from "@vercel/analytics/react";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import "@/styles/globals.css";
import clsx from "clsx";
import { satoshi, inter } from "@/styles/fonts";
import ModalProvider from "#/ui/modal-provider";

function MyApp({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps<{ session: Session }>) {
  return (
    <SessionProvider session={session}>
      <Toaster />
      <ModalProvider>
        <main className={clsx(satoshi.variable, inter.variable)}>
          <Component {...pageProps} />
        </main>
      </ModalProvider>
      <Analytics />
    </SessionProvider>
  );
}

export default MyApp;
