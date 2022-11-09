import Head from "next/head";
import { FAVICON_FOLDER } from "@/lib/constants";

export default function Meta() {
  return (
    <Head>
      <title>Dub - Open-Source Bitly Alternative</title>
      <meta
        name="description"
        content="An open-source link shortener SaaS with built-in analytics and free custom domains."
      />
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href={`${FAVICON_FOLDER}/apple-touch-icon.png`}
      />
      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href={`${FAVICON_FOLDER}/favicon-32x32.png`}
      />
      <link
        rel="icon"
        type="image/png"
        sizes="16x16"
        href={`${FAVICON_FOLDER}/favicon-16x16.png`}
      />
      <link rel="manifest" href="/site.webmanifest" />
      <link
        rel="mask-icon"
        href={`${FAVICON_FOLDER}/safari-pinned-tab.svg`}
        color="#5bbad5"
      />
      <meta name="msapplication-TileColor" content="#ffffff" />
      <meta name="theme-color" content="#ffffff" />

      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta itemProp="image" content="https://dub.sh/_static/thumbnail.png" />
      <meta property="og:logo" content="https://dub.sh/_static/logo.png"></meta>
      <meta
        property="og:image"
        content="https://dub.sh/_static/thumbnail.png"
      />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@dubdotsh" />
      <meta name="twitter:creator" content="@steventey" />
      <meta
        name="twitter:title"
        content="Dub - Open-Source Bitly Alternative"
      />
      <meta
        name="twitter:description"
        content="An open-source link shortener SaaS with built-in analytics and free custom domains."
      />
      <meta
        name="twitter:image"
        content="https://dub.sh/_static/thumbnail.png"
      />
    </Head>
  );
}
