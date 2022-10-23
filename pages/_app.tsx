import type { AppProps } from "next/app";
import { useEffect } from "react";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import PlausibleProvider from "next-plausible";
import useIsDarkmode from "@/lib/hooks/use-is-darkmode";
import "@/styles/globals.css";

function MyApp({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps<{ session: Session }>) {
  const isDark = useIsDarkmode();
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-color-scheme",
      isDark ? "light" : "dark",
    );
  }, []);
  return (
    <PlausibleProvider domain="dub.sh">
      <SessionProvider session={session}>
        <Component {...pageProps} />
      </SessionProvider>
    </PlausibleProvider>
  );
}

export default MyApp;
