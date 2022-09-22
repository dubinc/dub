import HomeLayout from "@/components/layout/home";
import { useCallback, useEffect } from "react";
import { useRouter } from "next/router";
import { useStatsModal } from "@/components/stats/stats-modal";
import Hero from "@/components/home/hero";
import Demo from "@/components/home/demo";
import Globe from "@/components/home/globe";
import Features from "@/components/home/features";
import Pricing from "@/components/home/pricing";
import Footer from "@/components/home/footer";

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
      <Footer />
    </HomeLayout>
  );
}

export async function getStaticProps() {
  const { stargazers_count: stars } = await fetch(
    "https://api.github.com/repos/steven-tey/dub"
  ).then((res) => res.json());

  return {
    props: {
      stars: stars || 420,
    },
    revalidate: 10,
  };
}
