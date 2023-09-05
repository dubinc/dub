import Head from "next/head";
import { FAVICON_FOLDER } from "#/lib/constants";

export default function Meta({
  title = "Dub - Link Management for Modern Marketing Teams",
  description = "Dub is an open-source link management tool for modern marketing teams to create, share, and track short links.",
  image = "https://dub.co/_static/thumbnail.png",
}: {
  title?: string;
  description?: string;
  image?: string;
}) {
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
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
      <meta itemProp="image" content={image} />
      <meta
        property="og:logo"
        content="https://public.blob.vercel-storage.com/kmKY9FhOzDRAX28c/diIX27B-vli9jFicKhqvO4Dzb2IrgHbaOdRLcT.png"
      ></meta>
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@dubdotco" />
      <meta name="twitter:creator" content="@steventey" />
      <meta
        name="twitter:title"
        content="Dub - Open-Source Bitly Alternative"
      />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Head>
  );
}
