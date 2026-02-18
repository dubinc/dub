import "dotenv-flow/config";

import { getSocialContent } from "@/lib/api/scrape-creators/get-social-content";

async function main() {
  const youtube = await getSocialContent({
    platform: "youtube",
    url: "https://www.youtube.com/shorts/JQeUImS7AV8",
  });

  console.log("youtube", youtube);

  const instagram = await getSocialContent({
    platform: "instagram",
    url: "https://www.instagram.com/reel/DUyedQHDMVZ/",
  });

  console.log("instagram", instagram);

  const twitter = await getSocialContent({
    platform: "twitter",
    url: "https://x.com/steventey/status/2016553369188643308",
  });

  console.log("twitter", twitter);

  const tiktok = await getSocialContent({
    platform: "tiktok",
    url: "https://www.tiktok.com/@mrbeast/video/7605369593946705182",
  });

  console.log("tiktok", tiktok);
}

main();
