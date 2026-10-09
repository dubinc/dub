import { News } from "./news";

export function SpecialNewsContent() {
  return (
    <News
      articles={[
        {
          href: "https://dub.co/startups",
          title: "Dub Startup Program 🚀",
          summary:
            "50% off our yearly Advanced plan – our biggest discount ever.",
          image: "https://assets.dub.co/og/startups.jpg",
        },
      ]}
    />
  );
}
