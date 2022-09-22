import Head from "next/head";

const faviconFolder = "/static/favicons";

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
        href={`${faviconFolder}/apple-touch-icon.png`}
      />
      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href={`${faviconFolder}/favicon-32x32.png`}
      />
      <link
        rel="icon"
        type="image/png"
        sizes="16x16"
        href={`${faviconFolder}/favicon-16x16.png`}
      />
      <link rel="manifest" href="/site.webmanifest" />
      <link
        rel="mask-icon"
        href={`${faviconFolder}/safari-pinned-tab.svg`}
        color="#5bbad5"
      />
      <meta name="msapplication-TileColor" content="#ffffff" />
      <meta name="theme-color" content="#ffffff" />

      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="keywords" content="hacker news, slack, bot" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta itemProp="image" content="https://dub.sh/static/thumbnail.png" />
      <meta property="og:logo" content="https://dub.sh/static/logo.png"></meta>
      <meta property="og:image" content="https://dub.sh/static/thumbnail.png" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@vercel" />
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
        content="https://dub.sh/static/thumbnail.png"
      />
    </Head>
  );
}
