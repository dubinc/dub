import { useRouter } from "next/router";
import { useCallback, useEffect } from "react";
import prisma from "@/lib/prisma";
import { useStatsModal } from "@/components/app/modals/stats-modal";
import Background from "@/components/shared/background";
import Demo from "@/components/home/demo";
import Features from "@/components/home/features";
import Globe from "@/components/home/globe";
import Hero from "@/components/home/hero";
import Logos from "@/components/home/logos";
import Pricing from "@/components/home/pricing";
import HomeLayout from "@/components/layout/home";
import OSS from "@/components/home/oss";
import Testimonials from "@/components/home/testimonials";
import getTweetsMetadata, { homepageTweets } from "@/lib/twitter";

export default function Home({
  userCount,
  stars,
  tweets,
}: {
  userCount: number;
  stars: number;
  tweets: any;
}) {
  const router = useRouter();
  const { key: stats } = router.query;
  const { setShowStatsModal, StatsModal } = useStatsModal();

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      router.push("/", undefined, { scroll: false });
    }
  }, []);

  useEffect(() => {
    if (stats) {
      setShowStatsModal(true);
    } else {
      setShowStatsModal(false);
    }
  }, [stats]);

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  return (
    <HomeLayout>
      <StatsModal />
      <div className="z-10">
        <Hero />
        <Demo />
        <Logos />
        <Globe />
        <Features />
        <Testimonials userCount={userCount} tweets={tweets} />
        <Pricing />
        <OSS stars={stars} />
      </div>
      <Background />
    </HomeLayout>
  );
}

export async function getStaticProps() {
  const userCount = await prisma.user.count();

  const { stargazers_count: stars } = await fetch(
    "https://api.github.com/repos/steven-tey/dub",
    {
      // optional – feel free to remove if you don't want to display star count
      ...(process.env.GITHUB_OAUTH_TOKEN && {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_OAUTH_TOKEN}`,
          "Content-Type": "application/json",
        },
      }),
    },
  ).then((res) => res.json());

  const tweets = await getTweetsMetadata(homepageTweets);

  return {
    props: {
      userCount,
      stars,
      tweets,
    },
    revalidate: 60,
  };
}
