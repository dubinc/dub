import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import {SignIn} from "@/components/auth/sign-in"

import {
  ClerkProvider,
  SignedIn,
  SignedOut,
} from "@clerk/nextjs";
import { useRouter } from "next/router";

function MyApp({ Component, pageProps }: AppProps) {
  const publicPages = [
    "/",
  ];
  const router = useRouter();
  const isPublicPage = publicPages.includes(router.pathname);
  return (
    <>
      <Head>
        <title>Dub - Open-Source Link Shortener</title>
        <meta
          name="description"
          content="An open-source link shortener built with Vercel Edge Functions and Upstash Redis."
        />
        <link rel="icon" href="/favicon.ico" />
        <link rel="shortcut icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/favicon.ico" />
        <meta name="theme-color" content="#7b46f6" />

        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="keywords" content="hacker news, slack, bot" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta itemProp="image" content="https://dub.sh/thumbnail.png" />
        <meta property="og:image" content="https://dub.sh/thumbnail.png" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@vercel" />
        <meta name="twitter:creator" content="@steventey" />
        <meta name="twitter:title" content="Dub - Open-Source Link Shortener" />
        <meta
          name="twitter:description"
          content="An open-source link shortener built with Vercel Edge Functions and Upstash Redis."
        />
        <meta name="twitter:image" content="https://dub.sh/thumbnail.png" />
      </Head>
      <ClerkProvider {...pageProps}>
        {isPublicPage ? <Component {...pageProps} /> : (
          <>
            <SignedIn>
              <Component {...pageProps} />
            </SignedIn>
            <SignedOut>
              <div className="flex items-center justify-center min-h-screen">
              <SignIn/>

              </div>
            </SignedOut>
          </>
        )}
      </ClerkProvider>
    </>
  );
}

export default MyApp;
