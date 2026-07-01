import { normalizeInstagramUserPost } from "@/lib/partner-content-search/ingestion/normalize-content";
import { describe, expect, test } from "vitest";

describe("partner content normalization", () => {
  test("canonicalizes Instagram reel URLs and uses captions as titles", () => {
    const item = normalizeInstagramUserPost({
      id: "3590000000000000000",
      pk: "3590000000000000000",
      code: "DZqeWQvJ1Fk",
      url: "https://www.instagram.com/andresthedesigner/p/DZqeWQvJ1Fk/",
      media_type: 2,
      product_type: "clips",
      taken_at: 1781659229,
      caption: {
        text: "Framer 3.0 is pretty nice imo\n#framer #webdesign",
      },
      play_count: 1234,
      ig_play_count: null,
      like_count: 123,
      comment_count: 12,
      display_uri: null,
      image_versions2: {
        candidates: [{ url: "https://cdn.example.com/thumbnail.jpg" }],
      },
      video_versions: [{ url: "https://cdn.example.com/video.mp4" }],
      video_duration: 12.3,
      has_audio: true,
    });

    expect(item).toMatchObject({
      platformContentId: "DZqeWQvJ1Fk",
      url: "https://www.instagram.com/reel/DZqeWQvJ1Fk/",
      contentType: "reel",
      title: "Framer 3.0 is pretty nice imo",
      description: "Framer 3.0 is pretty nice imo\n#framer #webdesign",
      thumbnailUrl: "https://cdn.example.com/thumbnail.jpg",
      viewCount: 1234,
      likeCount: 123,
      commentCount: 12,
      transcriptEligible: true,
    });
  });
});
