import PlausibleProvider from "next-plausible";
import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import "@/styles/globals.css";
import type { AppProps } from "next/app";

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
