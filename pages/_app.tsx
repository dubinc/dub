import type { AppProps } from "next/app";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import PlausibleProvider from "next-plausible";
import "@/styles/globals.css";

function MyApp({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps<{ session: Session }>) {
  return (
    <PlausibleProvider domain="dub.sh">
      <SessionProvider session={session}>
        <Component {...pageProps} />
      </SessionProvider>
    </PlausibleProvider>
  );
}

export default MyApp;
