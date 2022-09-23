import HomeLayout from "@/components/layout/home";
import { useCallback, useEffect } from "react";
import { useRouter } from "next/router";
import { useStatsModal } from "@/components/stats/stats-modal";
import Hero from "@/components/home/hero";
import Demo from "@/components/home/demo";
import Globe from "@/components/home/globe";
import Features from "@/components/home/features";
import Pricing from "@/components/home/pricing";

export default function Home({ stars }: { stars: number }) {
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
      <Hero />
      <Demo />
      <Globe />
      <Features stars={stars} />
      <Pricing />
    </HomeLayout>
  );
}

export async function getStaticProps() {
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
    }
  ).then((res) => res.json());

  return {
    props: {
      stars: stars || 0,
    },
    revalidate: 10,
  };
}
