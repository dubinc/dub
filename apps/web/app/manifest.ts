import { MetadataRoute } from "next";
import { FAVICON_FOLDER } from "@dub/utils";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dub.co App",
    short_name: "Dub.co",
    description: "Dub.co – the open-source link management infrastructure.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: `/${FAVICON_FOLDER}/android-chrome-192x192.png`,
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: `/${FAVICON_FOLDER}/android-chrome-512x512.png`,
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
