import { Metadata } from "next";
import { HOME_DOMAIN } from "../constants";

export function constructMetadata({
  title = `${process.env.NEXT_PUBLIC_APP_NAME} - Link Management for Modern Marketing Teams`,
  description = `${process.env.NEXT_PUBLIC_APP_NAME} is the open-source link management platform for modern marketing teams to create marketing campaigns, link sharing features, and referral programs.`,
  image = "https://assets.dub.co/thumbnail.jpg",
  icons = [
    {
      rel: "apple-touch-icon",
      sizes: "32x32",
      url: "/apple-touch-icon.png",
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "32x32",
      url: "/favicon-32x32.png",
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "16x16",
      url: "/favicon-16x16.png",
    },
  ],
  noIndex = false,
}: {
  title?: string;
  description?: string;
  image?: string | null;
  icons?: Metadata["icons"];
  noIndex?: boolean;
} = {}): Metadata {
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(image && {
        images: [
          {
            url: image,
          },
        ],
      }),
    },
    twitter: {
      title,
      description,
      ...(image && {
        card: "summary_large_image",
        images: [image],
      }),
      creator: "@dubdotco",
    },
    icons,
    metadataBase: new URL(HOME_DOMAIN),
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
  };
}
