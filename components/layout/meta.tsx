import Head from "next/head";

export default function Meta() {
  return (
    <Head>
      <title>Dub - Open-Source Bitly Alternative</title>
      <meta
        name="description"
        content="An open-source link shortener with built-in analytics and free custom domains."
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
        content="An open-source link shortener with built-in analytics and free custom domains."
      />
      <meta name="twitter:image" content="https://dub.sh/thumbnail.png" />
    </Head>
  );
}
