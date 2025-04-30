import { HOME_DOMAIN } from "@dub/utils/src";
import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GetQR App",
    short_name: "GetQR",
    description: "GetQR | Create Custom QR Codes with Logo, Colors & Tracking",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: `${HOME_DOMAIN}/images/android-chrome-192x192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: `${HOME_DOMAIN}/images/android-chrome-512x512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
