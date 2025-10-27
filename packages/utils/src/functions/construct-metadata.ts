import { Metadata } from "next";
import { HOME_DOMAIN } from "../constants";

export function constructMetadata({
  title,
  fullTitle,
  description = "Design dynamic QR codes with logos, frames, and colors. Track scans, edit content anytime, and download in JPG, PNG, or SVG. Start free—no credit card needed.",
  image = `${HOME_DOMAIN}/images/thumbnail.jpg`,
  video,
  icons = [
    {
      rel: "apple-touch-icon",
      sizes: "32x32",
      url: `${HOME_DOMAIN}/images/android-chrome-192x192.png`,
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "32x32",
      url: `${HOME_DOMAIN}/images/favicon-32x32.png`,
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "16x16",
      url: `${HOME_DOMAIN}/images/favicon-16x16.png`,
    },
  ],
  url,
  canonicalUrl,
  noIndex = false,
  manifest,
}: {
  title?: string;
  fullTitle?: string;
  description?: string;
  image?: string | null;
  video?: string | null;
  icons?: Metadata["icons"];
  url?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  manifest?: string | URL | null;
} = {}): Metadata {
  return {
    title:
      fullTitle ||
      (title
        ? `${title} | GetQR`
        : "GetQR | Create Custom QR Codes with Logo, Colors & Tracking"),
    description,
    viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
    openGraph: {
      title,
      description,
      ...(image && {
        images: image,
      }),
      url,
      ...(video && {
        videos: video,
      }),
    },
    twitter: {
      title,
      description,
      ...(image && {
        card: "summary_large_image",
        images: [image],
      }),
      ...(video && {
        player: video,
      }),
      creator: "@dubdotco",
    },
    icons,
    metadataBase: new URL(HOME_DOMAIN),
    ...((url || canonicalUrl) && {
      alternates: {
        canonical: url || canonicalUrl,
      },
    }),
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
    ...(manifest && {
      manifest,
    }),
    other: {
      "ahrefs-site-verification":
        "e5a6dbdcc10bdcd4b469eb0b9351966a19df09770ab98a83ef5dff85c883160a",
    },
  };
}
